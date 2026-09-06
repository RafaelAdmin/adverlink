/**
 * Telegram channel ownership verification (server-only).
 */

import {
  codesMatch,
  verifyCodeInDescription,
} from '@/lib/verification-check'
import {
  fetchChannelPreview,
  normalizePublicUsername,
  parseChannelDescriptionFromPreviewHtml,
  PREVIEW_USER_AGENT,
} from '@/lib/telegram-web-preview'

export const TELEGRAM_VERIFY_RETRY_DELAYS_MS = [0, 2000, 4000, 6000] as const

export type TelegramDescriptionSource = 'bot_api' | 'web_preview'

export type TelegramVerifyReason =
  | 'verified'
  | 'already_verified'
  | 'code_not_found'
  | 'code_mismatch'
  | 'channel_not_found'
  | 'channel_inaccessible'
  | 'telegram_unavailable'
  | 'invalid_username'

export type TelegramDescriptionFetchStatus =
  | 'ok'
  | 'not_found'
  | 'inaccessible'
  | 'error'

export type TelegramDescriptionFetchResult = {
  status: TelegramDescriptionFetchStatus
  description: string
  error: string | null
  retryable: boolean
}

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function logVerify(event: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[telegram-verify]', event, meta)
  }
}

export function normalizeTelegramUsername(input: string): string | null {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed) || /t\.me\//i.test(trimmed)) return null
  return normalizePublicUsername(trimmed)
}

export async function fetchTelegramDescriptionFromBotApi(
  username: string,
  botToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<TelegramDescriptionFetchResult> {
  const cacheBust = Date.now()
  const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${encodeURIComponent(username)}&_=${cacheBust}`

  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    const data = (await response.json()) as {
      ok?: boolean
      result?: { description?: string }
      error_code?: number
      description?: string
    }

    if (!data.ok) {
      const message = data.description || 'Telegram API error'
      const lower = message.toLowerCase()

      if (lower.includes('chat not found')) {
        return {
          status: 'not_found',
          description: '',
          error: message,
          retryable: false,
        }
      }

      if (
        lower.includes('bot was blocked') ||
        lower.includes('not enough rights') ||
        lower.includes('private') ||
        data.error_code === 403
      ) {
        return {
          status: 'inaccessible',
          description: '',
          error: message,
          retryable: false,
        }
      }

      return {
        status: 'error',
        description: '',
        error: message,
        retryable: true,
      }
    }

    const description = data.result?.description || ''
    return {
      status: 'ok',
      description,
      error: null,
      retryable: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fetch error'
    return {
      status: 'error',
      description: '',
      error: message,
      retryable: true,
    }
  }
}

export async function fetchTelegramDescriptionFromWebPreview(
  username: string,
  fetchImpl: FetchImpl = fetch,
): Promise<TelegramDescriptionFetchResult> {
  const preview = await fetchChannelPreview(username, fetchImpl)

  if (!preview.ok || !preview.html) {
    const retryable = preview.status === 0 || preview.status >= 500
    const notFound = preview.status === 404

    return {
      status: notFound ? 'not_found' : 'error',
      description: '',
      error: preview.error || `HTTP ${preview.status}`,
      retryable,
    }
  }

  const description = parseChannelDescriptionFromPreviewHtml(preview.html) || ''
  return {
    status: 'ok',
    description,
    error: null,
    retryable: false,
  }
}

export type FreshTelegramDescriptions = {
  botApi: TelegramDescriptionFetchResult
  webPreview: TelegramDescriptionFetchResult
}

export async function fetchFreshTelegramDescriptions(
  username: string,
  botToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<FreshTelegramDescriptions> {
  const [botApi, webPreview] = await Promise.all([
    fetchTelegramDescriptionFromBotApi(username, botToken, fetchImpl),
    fetchTelegramDescriptionFromWebPreview(username, fetchImpl),
  ])

  return { botApi, webPreview }
}

export function findVerificationCodeInDescriptions(
  storedCode: string,
  descriptions: Array<{ source: TelegramDescriptionSource; text: string }>,
): TelegramDescriptionSource | null {
  for (const item of descriptions) {
    if (verifyCodeInDescription(storedCode, storedCode, item.text)) {
      return item.source
    }
  }

  return null
}

export type VerifyTelegramChannelDescriptionResult = {
  verified: boolean
  reason: TelegramVerifyReason
  attempts: number
  matchedSource?: TelegramDescriptionSource
  descriptionLength?: number
}

export async function verifyTelegramChannelDescription(options: {
  username: string
  submittedCode: string
  storedCode: string
  botToken: string
  fetchImpl?: FetchImpl
  retryDelaysMs?: readonly number[]
}): Promise<VerifyTelegramChannelDescriptionResult> {
  const {
    username: rawUsername,
    submittedCode,
    storedCode,
    botToken,
    fetchImpl = fetch,
    retryDelaysMs = TELEGRAM_VERIFY_RETRY_DELAYS_MS,
  } = options

  const username = normalizeTelegramUsername(rawUsername)
  if (!username) {
    logVerify('invalid_username', { rawUsername })
    return { verified: false, reason: 'invalid_username', attempts: 0 }
  }

  if (!codesMatch(submittedCode, storedCode)) {
    logVerify('code_mismatch', { username })
    return { verified: false, reason: 'code_mismatch', attempts: 0 }
  }

  let channelReachable = false
  let sawPermanentChannelError = false
  let permanentReason: TelegramVerifyReason | null = null
  let lastDescriptionLength = 0

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
    if (attempt > 0) {
      const waitMs = retryDelaysMs[attempt] - retryDelaysMs[attempt - 1]
      if (waitMs > 0) await delay(waitMs)
    }

    logVerify('attempt_start', { username, attempt: attempt + 1 })

    const fresh = await fetchFreshTelegramDescriptions(username, botToken, fetchImpl)

    const sources: Array<{ source: TelegramDescriptionSource; text: string }> = []

    if (fresh.botApi.status === 'ok') {
      channelReachable = true
      sources.push({ source: 'bot_api', text: fresh.botApi.description })
      lastDescriptionLength = Math.max(lastDescriptionLength, fresh.botApi.description.length)
      logVerify('channel_fetched', {
        username,
        source: 'bot_api',
        descriptionLength: fresh.botApi.description.length,
        attempt: attempt + 1,
      })
    } else if (fresh.botApi.status === 'not_found') {
      sawPermanentChannelError = true
      permanentReason = 'channel_not_found'
      logVerify('channel_not_found', { username, source: 'bot_api', attempt: attempt + 1 })
    } else if (fresh.botApi.status === 'inaccessible') {
      sawPermanentChannelError = true
      permanentReason = 'channel_inaccessible'
      logVerify('channel_inaccessible', {
        username,
        source: 'bot_api',
        error: fresh.botApi.error,
        attempt: attempt + 1,
      })
    } else {
      logVerify('source_error', {
        username,
        source: 'bot_api',
        error: fresh.botApi.error,
        retryable: fresh.botApi.retryable,
        attempt: attempt + 1,
      })
    }

    if (fresh.webPreview.status === 'ok') {
      channelReachable = true
      sources.push({ source: 'web_preview', text: fresh.webPreview.description })
      lastDescriptionLength = Math.max(lastDescriptionLength, fresh.webPreview.description.length)
      logVerify('channel_fetched', {
        username,
        source: 'web_preview',
        descriptionLength: fresh.webPreview.description.length,
        attempt: attempt + 1,
      })
    } else if (fresh.webPreview.status === 'not_found' && !channelReachable) {
      sawPermanentChannelError = true
      permanentReason = 'channel_not_found'
      logVerify('channel_not_found', { username, source: 'web_preview', attempt: attempt + 1 })
    } else if (fresh.webPreview.status === 'error') {
      logVerify('source_error', {
        username,
        source: 'web_preview',
        error: fresh.webPreview.error,
        retryable: fresh.webPreview.retryable,
        attempt: attempt + 1,
      })
    }

    if (sawPermanentChannelError && permanentReason && !channelReachable) {
      return {
        verified: false,
        reason: permanentReason,
        attempts: attempt + 1,
      }
    }

    const matchedSource = findVerificationCodeInDescriptions(storedCode, sources)
    if (matchedSource) {
      logVerify('code_found', {
        username,
        source: matchedSource,
        attempt: attempt + 1,
        descriptionLength: lastDescriptionLength,
      })
      return {
        verified: true,
        reason: 'verified',
        attempts: attempt + 1,
        matchedSource,
        descriptionLength: lastDescriptionLength,
      }
    }

    if (channelReachable) {
      logVerify('code_not_found_yet', {
        username,
        attempt: attempt + 1,
        descriptionLength: lastDescriptionLength,
      })
    }
  }

  if (!channelReachable) {
    logVerify('telegram_unavailable', { username, attempts: retryDelaysMs.length })
    return {
      verified: false,
      reason: 'telegram_unavailable',
      attempts: retryDelaysMs.length,
    }
  }

  logVerify('code_not_found_final', {
    username,
    attempts: retryDelaysMs.length,
    descriptionLength: lastDescriptionLength,
  })

  return {
    verified: false,
    reason: 'code_not_found',
    attempts: retryDelaysMs.length,
    descriptionLength: lastDescriptionLength,
  }
}

/** @internal Exported for tests documenting fetch headers. */
export const TELEGRAM_VERIFY_FETCH_HEADERS = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  Accept: 'text/html',
  'User-Agent': PREVIEW_USER_AGENT,
} as const
