export function normalizeVerificationCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Collapse whitespace and normalize common Telegram/HTML text quirks for exact token search. */
export function normalizeTextForCodeSearch(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

export function codesMatch(
  submittedCode: string,
  storedCode: string | null | undefined,
): boolean {
  if (!submittedCode || !storedCode) return false
  return normalizeVerificationCode(submittedCode) === normalizeVerificationCode(storedCode)
}

/** Requires exact match with stored code and presence in channel description. */
export function verifyCodeInDescription(
  submittedCode: string,
  storedCode: string | null | undefined,
  description: string,
): boolean {
  if (!codesMatch(submittedCode, storedCode)) return false

  const normalizedStored = normalizeVerificationCode(storedCode!)
  const normalizedDescription = normalizeTextForCodeSearch(description)
  return normalizedDescription.includes(normalizedStored)
}
