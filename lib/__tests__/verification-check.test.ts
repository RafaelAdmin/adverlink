import { describe, expect, it } from 'vitest'
import { verifyCodeInDescription } from '@/lib/verification-check'

describe('verifyCodeInDescription', () => {
  it('requires exact stored code match and description presence', () => {
    expect(
      verifyCodeInDescription(
        'ADVERLINK-ABC123',
        'ADVERLINK-ABC123',
        'Official channel. Code: ADVERLINK-ABC123',
      ),
    ).toBe(true)
  })

  it('rejects substring-only match without exact code', () => {
    expect(
      verifyCodeInDescription(
        'ADVERLINK',
        'ADVERLINK-ABC123',
        'Official channel. Code: ADVERLINK-ABC123',
      ),
    ).toBe(false)
  })

  it('rejects when code is missing from description', () => {
    expect(
      verifyCodeInDescription('ADVERLINK-ABC123', 'ADVERLINK-ABC123', 'No code here'),
    ).toBe(false)
  })

  it('rejects when stored code is missing', () => {
    expect(verifyCodeInDescription('ADVERLINK-ABC123', null, 'ADVERLINK-ABC123')).toBe(false)
  })
})
