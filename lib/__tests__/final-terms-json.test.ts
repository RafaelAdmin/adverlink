import { describe, expect, it } from 'vitest'
import { parseFinalTermsJson, extractAdditionalTermsNotes } from '@/lib/final-terms-json'

describe('parseFinalTermsJson', () => {
  it('returns empty object for null/invalid input', () => {
    expect(parseFinalTermsJson(null)).toEqual({})
    expect(parseFinalTermsJson(undefined)).toEqual({})
    expect(parseFinalTermsJson('string')).toEqual({})
    expect(parseFinalTermsJson([])).toEqual({})
  })

  it('extracts notes string only', () => {
    expect(parseFinalTermsJson({ notes: 'hello' })).toEqual({ notes: 'hello' })
    expect(parseFinalTermsJson({ notes: 123, extra: 'x' })).toEqual({})
  })

  it('malformed legacy JSON does not throw', () => {
    expect(extractAdditionalTermsNotes({ notes: { nested: true } })).toBe('')
    expect(extractAdditionalTermsNotes({ notes: 'valid note' })).toBe('valid note')
  })
})
