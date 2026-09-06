import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchTelegramDescriptionFromBotApi,
  fetchTelegramDescriptionFromWebPreview,
  findVerificationCodeInDescriptions,
  normalizeTelegramUsername,
  TELEGRAM_VERIFY_RETRY_DELAYS_MS,
  verifyTelegramChannelDescription,
} from '@/lib/telegram-verification'
import { parseChannelDescriptionFromPreviewHtml } from '@/lib/telegram-web-preview'

const CODE = 'ADVERLINK-ABC123'

function botOk(description: string) {
  return new Response(
    JSON.stringify({ ok: true, result: { description } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function botNotFound() {
  return new Response(
    JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function botError(message: string) {
  return new Response(
    JSON.stringify({ ok: false, error_code: 500, description: message }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function webHtml(description: string) {
  return new Response(
    `<html><div class="tgme_channel_info_description">${description}</div></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

describe('parseChannelDescriptionFromPreviewHtml', () => {
  it('extracts description text from preview HTML', () => {
    expect(parseChannelDescriptionFromPreviewHtml(
      '<div class="tgme_channel_info_description">Hello<br/>ADVERLINK-ABC123</div>',
    )).toBe('Hello\nADVERLINK-ABC123')
  })
})

describe('normalizeTelegramUsername', () => {
  it('normalizes @username and strips invalid characters', () => {
    expect(normalizeTelegramUsername('@My_Channel')).toBe('My_Channel')
    expect(normalizeTelegramUsername('https://t.me/test')).toBeNull()
  })
})

describe('fetchTelegramDescriptionFromBotApi', () => {
  it('uses no-store fetch and returns description', async () => {
    const fetchImpl = vi.fn(async () => botOk(`Code ${CODE}`))
    const result = await fetchTelegramDescriptionFromBotApi('testchannel', 'token', fetchImpl)

    expect(result.status).toBe('ok')
    expect(result.description).toContain(CODE)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.cache).toBe('no-store')
  })

  it('classifies chat not found as permanent', async () => {
    const result = await fetchTelegramDescriptionFromBotApi(
      'missing',
      'token',
      vi.fn(async () => botNotFound()),
    )
    expect(result.status).toBe('not_found')
    expect(result.retryable).toBe(false)
  })
})

describe('findVerificationCodeInDescriptions', () => {
  it('finds code in normalized description text', () => {
    expect(
      findVerificationCodeInDescriptions(CODE, [
        { source: 'bot_api', text: `My channel\n${CODE}\n` },
      ]),
    ).toBe('bot_api')
  })
})

describe('verifyTelegramChannelDescription', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('verifies when code is found on first attempt', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('api.telegram.org')) return botOk(CODE)
      return webHtml('')
    })

    const promise = verifyTelegramChannelDescription({
      username: '@testchannel',
      submittedCode: CODE,
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
      retryDelaysMs: [0],
    })

    const result = await promise
    expect(result.verified).toBe(true)
    expect(result.reason).toBe('verified')
    expect(result.attempts).toBe(1)
  })

  it('retries when stale description is returned first, then succeeds', async () => {
    let botCalls = 0
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('api.telegram.org')) {
        botCalls += 1
        return botOk(botCalls >= 2 ? CODE : 'Old description')
      }
      return webHtml('')
    })

    const promise = verifyTelegramChannelDescription({
      username: 'testchannel',
      submittedCode: CODE,
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
      retryDelaysMs: [0, 2000],
    })

    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result.verified).toBe(true)
    expect(result.attempts).toBe(2)
    expect(botCalls).toBeGreaterThanOrEqual(2)
  })

  it('returns code_not_found after all retries when code never appears', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('api.telegram.org')) return botOk('No code yet')
      return webHtml('Still empty')
    })

    const promise = verifyTelegramChannelDescription({
      username: 'testchannel',
      submittedCode: CODE,
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
      retryDelaysMs: TELEGRAM_VERIFY_RETRY_DELAYS_MS,
    })

    await vi.advanceTimersByTimeAsync(6000)
    const result = await promise

    expect(result.verified).toBe(false)
    expect(result.reason).toBe('code_not_found')
    expect(result.attempts).toBe(4)
  })

  it('returns telegram_unavailable when channel cannot be fetched', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })

    const promise = verifyTelegramChannelDescription({
      username: 'testchannel',
      submittedCode: CODE,
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
      retryDelaysMs: [0, 2000],
    })

    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result.verified).toBe(false)
    expect(result.reason).toBe('telegram_unavailable')
  })

  it('returns channel_not_found for missing channels without retrying success path', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('api.telegram.org')) return botNotFound()
      return new Response('not found', { status: 404 })
    })

    const result = await verifyTelegramChannelDescription({
      username: 'missing',
      submittedCode: CODE,
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
      retryDelaysMs: TELEGRAM_VERIFY_RETRY_DELAYS_MS,
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toBe('channel_not_found')
  })

  it('rejects code mismatch without fetching Telegram', async () => {
    const fetchImpl = vi.fn()
    const result = await verifyTelegramChannelDescription({
      username: 'testchannel',
      submittedCode: 'ADVERLINK-WRONG1',
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
    })

    expect(result.reason).toBe('code_mismatch')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('accepts code from web preview when bot API is stale', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('api.telegram.org')) return botOk('stale')
      return webHtml(CODE)
    })

    const result = await verifyTelegramChannelDescription({
      username: 'testchannel',
      submittedCode: CODE,
      storedCode: CODE,
      botToken: 'token',
      fetchImpl,
      retryDelaysMs: [0],
    })

    expect(result.verified).toBe(true)
    expect(result.matchedSource).toBe('web_preview')
  })
})

describe('fetchTelegramDescriptionFromWebPreview', () => {
  it('returns parsed description from preview page', async () => {
    const fetchImpl = vi.fn(async () => webHtml(`Channel about ${CODE}`))
    const result = await fetchTelegramDescriptionFromWebPreview('testchannel', fetchImpl)
    expect(result.status).toBe('ok')
    expect(result.description).toContain(CODE)
  })
})
