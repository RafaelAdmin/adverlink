/** UI-facing shape for optional final_terms JSONB notes (Phase 3A). */
export type FinalTermsJson = {
  notes?: string
}

export function parseFinalTermsJson(raw: unknown): FinalTermsJson {
  if (raw == null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) return {}

  const record = raw as Record<string, unknown>
  const parsed: FinalTermsJson = {}

  if (typeof record.notes === 'string') {
    parsed.notes = record.notes
  }

  return parsed
}

export function extractAdditionalTermsNotes(raw: unknown): string {
  return parseFinalTermsJson(raw).notes ?? ''
}
