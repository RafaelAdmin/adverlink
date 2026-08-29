/**
 * Server-only Telegram public web preview fetch + parse (Analytics V2).
 * Do not import from client components.
 */

import type { SnapshotCheckpoint } from '@/lib/telegram-snapshot-schedule'

const TELEGRAM_HOSTS = ['t.me', 'telegram.me'] as const
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{5,32}$/
export const PREVIEW_FETCH_TIMEOUT_MS = 10_000
export const PREVIEW_USER_AGENT = 'AdverLink/1.0 (+https://adverlink.app)'

/** Grace period after scheduled_at before marking views permanently unavailable. */
export const SNAPSHOT_RETRY_GRACE_MS: Record<SnapshotCheckpoint, number> = {
  publication: 2 * 60 * 60 * 1000,
  '1h': 3 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 12 * 60 * 60 * 1000,
  '48h': 12 * 60 * 60 * 1000,
}

export type PreviewFetchResult = {
  ok: boolean
  status: number
  contentType: string | null
  htmlLength: number
  error: string | null
  html: string
}

export type PostViewExtractResult = {
  found: boolean
  rawViewText: string | null
  parsedViews: number | null
}

export function normalizePublicUsername(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('/') || trimmed.includes('.')) {
    return null
  }

  const withoutAt = trimmed.replace(/^@+/, '')
  if (!withoutAt || withoutAt.includes('@')) return null
  if (!USERNAME_PATTERN.test(withoutAt)) return null

  return withoutAt
}

export function buildPreviewUrl(username: string, messageId?: number): string {
  const base = `https://t.me/s/${encodeURIComponent(username)}`
  if (messageId === undefined) return base
  return `${base}/${messageId}`
}

/** Returns null for ambiguous or failed parses — never 0 on failure. */
export function parseAbbreviatedViewCount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\u00a0/g, ' ').replace(/\s*views?\s*$/i, '').trim()
  if (!cleaned) return null

  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([KkMm])?$/)
  if (!match) return null

  const numeric = Number(match[1])
  if (!Number.isFinite(numeric) || numeric <= 0) return null

  const suffix = match[2]?.toUpperCase()
  if (suffix === 'K') return Math.round(numeric * 1_000)
  if (suffix === 'M') return Math.round(numeric * 1_000_000)
  if (!suffix) return Math.round(numeric)

  return null
}

export function acceptMonotonicViewUpdate(
  currentViews: number | null | undefined,
  parsedViews: number,
): boolean {
  if (parsedViews <= 0) return false
  if (currentViews == null) return true
  return parsedViews >= currentViews
}

export function isSnapshotRetryExpired(
  checkpoint: string,
  scheduledAt: string | Date,
  now: Date = new Date(),
): boolean {
  const graceMs =
    SNAPSHOT_RETRY_GRACE_MS[checkpoint as SnapshotCheckpoint] ??
    SNAPSHOT_RETRY_GRACE_MS['24h']
  const scheduled = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt
  return now.getTime() >= scheduled.getTime() + graceMs
}

/** Parse all visible posts for a channel from preview HTML. */
export function parseChannelPreviewHtml(html: string, username: string): Map<number, number> {
  const expectedUser = username.toLowerCase()
  const viewsByMessageId = new Map<number, number>()
  const dataPostRegex = /data-post="([^"]+)"/gi
  let match: RegExpExecArray | null

  while ((match = dataPostRegex.exec(html)) !== null) {
    const dataPost = match[1]
    const slashIndex = dataPost.lastIndexOf('/')
    if (slashIndex <= 0) continue

    const postUsername = dataPost.slice(0, slashIndex)
    const postMessageIdStr = dataPost.slice(slashIndex + 1)

    if (postUsername.toLowerCase() !== expectedUser) continue
    if (!/^\d+$/.test(postMessageIdStr)) continue

    const messageId = Number(postMessageIdStr)
    if (!Number.isSafeInteger(messageId) || messageId <= 0) continue

    const blockStart = match.index
    const nextPostIndex = html.indexOf('data-post=', blockStart + 1)
    const blockEnd = nextPostIndex === -1 ? Math.min(html.length, blockStart + 12_000) : nextPostIndex
    const block = html.slice(blockStart, blockEnd)

    const viewsMatch = block.match(/class="tgme_widget_message_views"[^>]*>([^<]+)</i)
    if (!viewsMatch) continue

    const parsed = parseAbbreviatedViewCount(viewsMatch[1].trim())
    if (parsed !== null) {
      viewsByMessageId.set(messageId, parsed)
    }
  }

  return viewsByMessageId
}

/** Parse views for one exact post only (case-insensitive username, exact message ID). */
export function extractViewsForPost(
  html: string,
  username: string,
  messageId: number,
): PostViewExtractResult {
  const map = parseChannelPreviewHtml(html, username)
  if (map.has(messageId)) {
    const parsedViews = map.get(messageId)!
    return {
      found: true,
      rawViewText: String(parsedViews),
      parsedViews,
    }
  }

  const expectedUser = username.toLowerCase()
  const dataPostRegex = /data-post="([^"]+)"/gi
  let match: RegExpExecArray | null
  let found = false

  while ((match = dataPostRegex.exec(html)) !== null) {
    const dataPost = match[1]
    const slashIndex = dataPost.lastIndexOf('/')
    if (slashIndex <= 0) continue
    const postUsername = dataPost.slice(0, slashIndex)
    const postMessageIdStr = dataPost.slice(slashIndex + 1)
    if (postUsername.toLowerCase() !== expectedUser) continue
    if (postMessageIdStr !== String(messageId)) continue
    found = true
    break
  }

  return { found, rawViewText: null, parsedViews: null }
}

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

async function fetchPreviewPageInternal(
  url: string,
  fetchImpl: FetchImpl = fetch,
): Promise<PreviewFetchResult> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return {
      ok: false,
      status: 0,
      contentType: null,
      htmlLength: 0,
      error: 'Invalid URL',
      html: '',
    }
  }

  if (!TELEGRAM_HOSTS.includes(parsedUrl.hostname as (typeof TELEGRAM_HOSTS)[number])) {
    return {
      ok: false,
      status: 0,
      contentType: null,
      htmlLength: 0,
      error: 'Refusing non-Telegram host',
      html: '',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS)

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
        'User-Agent': PREVIEW_USER_AGENT,
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type')
    const html = await response.text()

    return {
      ok: response.ok,
      status: response.status,
      contentType,
      htmlLength: html.length,
      error: response.ok ? null : `HTTP ${response.status}`,
      html,
    }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `Timeout after ${PREVIEW_FETCH_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : 'Unknown fetch error'

    return {
      ok: false,
      status: 0,
      contentType: null,
      htmlLength: 0,
      error: message,
      html: '',
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchChannelPreview(
  username: string,
  fetchImpl?: FetchImpl,
): Promise<PreviewFetchResult> {
  const normalized = normalizePublicUsername(username)
  if (!normalized) {
    return {
      ok: false,
      status: 0,
      contentType: null,
      htmlLength: 0,
      error: 'Invalid username',
      html: '',
    }
  }
  return fetchPreviewPageInternal(buildPreviewUrl(normalized), fetchImpl)
}

export async function fetchPostPreviewFallback(
  username: string,
  messageId: number,
  fetchImpl?: FetchImpl,
): Promise<PreviewFetchResult> {
  const normalized = normalizePublicUsername(username)
  if (!normalized || !Number.isSafeInteger(messageId) || messageId <= 0) {
    return {
      ok: false,
      status: 0,
      contentType: null,
      htmlLength: 0,
      error: 'Invalid username or message ID',
      html: '',
    }
  }
  return fetchPreviewPageInternal(buildPreviewUrl(normalized, messageId), fetchImpl)
}

export async function resolvePostViews(
  username: string,
  messageId: number,
  channelPreviewHtml: string | null,
  options?: { fetchImpl?: FetchImpl; allowFallback?: boolean },
): Promise<number | null> {
  if (channelPreviewHtml) {
    const fromChannel = parseChannelPreviewHtml(channelPreviewHtml, username).get(messageId)
    if (fromChannel !== undefined) return fromChannel
  }

  if (options?.allowFallback === false) return null

  const fallback = await fetchPostPreviewFallback(username, messageId, options?.fetchImpl)
  if (!fallback.ok || !fallback.html) return null

  return parseChannelPreviewHtml(fallback.html, username).get(messageId) ?? null
}

/** @internal PoC / tests */
export function parseMessageIdArg(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null
  const id = Number(input.trim())
  if (!Number.isSafeInteger(id) || id <= 0) return null
  return id
}
