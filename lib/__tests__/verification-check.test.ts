import { describe, expect, it } from 'vitest'
import {
  codesMatch,
  normalizeTextForCodeSearch,
  verifyCodeInDescription,
} from '@/lib/verification-check'

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

  it('accepts whitespace and line breaks around the code in description', () => {
    expect(
      verifyCodeInDescription(
        'ADVERLINK-ABC123',
        'ADVERLINK-ABC123',
        'Code:\n  ADVERLINK-ABC123  \nThanks',
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

  it('rejects wrong verification code even if another code is present', () => {
    expect(
      verifyCodeInDescription(
        'ADVERLINK-AAA111',
        'ADVERLINK-BBB222',
        'ADVERLINK-BBB222',
      ),
    ).toBe(false)
  })
})

describe('normalizeTextForCodeSearch', () => {
  it('collapses whitespace and normalizes nbsp', () => {
    expect(normalizeTextForCodeSearch('  hello\u00a0world \n test ')).toBe('HELLO WORLD TEST')
  })
})

describe('codesMatch', () => {
  it('matches trimmed case-insensitive codes', () => {
    expect(codesMatch(' adverlink-abc123 ', 'ADVERLINK-ABC123')).toBe(true)
  })
})
