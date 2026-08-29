import { describe, expect, it } from 'vitest'
import { parseTelegramPostUrl, telegramUsernamesMatch } from '../telegram-post-url'

describe('parseTelegramPostUrl', () => {
  it('parses public t.me channel post URLs', () => {
    const parsed = parseTelegramPostUrl('https://t.me/examplechannel/1234')
    expect(parsed).toEqual({
      username: 'examplechannel',
      messageId: 1234,
      raw: 'https://t.me/examplechannel/1234',
    })
  })

  it('parses telegram.me URLs', () => {
    const parsed = parseTelegramPostUrl('https://telegram.me/My_Channel/42')
    expect(parsed?.username).toBe('my_channel')
    expect(parsed?.messageId).toBe(42)
  })

  it('parses private /c/ URLs with synthetic username', () => {
    const parsed = parseTelegramPostUrl('https://t.me/c/1234567890/99')
    expect(parsed?.username).toBe('c/1234567890')
    expect(parsed?.messageId).toBe(99)
  })

  it('returns null for invalid URLs', () => {
    expect(parseTelegramPostUrl('https://example.com/foo')).toBeNull()
    expect(parseTelegramPostUrl('')).toBeNull()
  })
})

describe('telegramUsernamesMatch', () => {
  it('matches usernames case-insensitively without @', () => {
    expect(telegramUsernamesMatch('@ExampleChannel', 'examplechannel')).toBe(true)
  })
})
