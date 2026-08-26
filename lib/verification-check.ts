export function normalizeVerificationCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Requires exact match with stored code and presence in channel description. */
export function verifyCodeInDescription(
  submittedCode: string,
  storedCode: string | null | undefined,
  description: string,
): boolean {
  if (!submittedCode || !storedCode) return false

  const normalizedSubmitted = normalizeVerificationCode(submittedCode)
  const normalizedStored = normalizeVerificationCode(storedCode)

  if (normalizedSubmitted !== normalizedStored) return false
  return description.toUpperCase().includes(normalizedStored)
}
