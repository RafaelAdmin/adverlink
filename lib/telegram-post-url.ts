export type ParsedTelegramPostUrl = {
  username: string
  messageId: number
  raw: string
}

const PUBLIC_PATTERNS = [
  /^https?:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)\/?$/,
  /^https?:\/\/telegram\.me\/([a-zA-Z0-9_]+)\/(\d+)\/?$/,
]

const PRIVATE_PATTERN = /^https?:\/\/t\.me\/c\/(\d+)\/(\d+)\/?$/

export function parseTelegramPostUrl(input: string): ParsedTelegramPostUrl | null {
  const raw = input.trim()
  if (!raw) return null

  for (const pattern of PUBLIC_PATTERNS) {
    const match = raw.match(pattern)
    if (match) {
      const messageId = Number(match[2])
      if (!Number.isFinite(messageId) || messageId <= 0) return null
      return { username: match[1].toLowerCase(), messageId, raw }
    }
  }

  const privateMatch = raw.match(PRIVATE_PATTERN)
  if (privateMatch) {
    const messageId = Number(privateMatch[2])
    if (!Number.isFinite(messageId) || messageId <= 0) return null
    return { username: `c/${privateMatch[1]}`, messageId, raw }
  }

  return null
}

export function telegramUsernamesMatch(stored: string, parsed: string): boolean {
  const a = stored.replace('@', '').toLowerCase()
  const b = parsed.replace('@', '').toLowerCase()
  return a === b
}
