import { normalizeDealStatus, type ContentMode, type ContentStatus, type TermsStatus } from '@/lib/deal-lifecycle'
import type { AdRequest, CurrencyCode } from '@/lib/database.types'
import { extractAdditionalTermsNotes } from '@/lib/final-terms-json'

export type { CurrencyCode as FinalTermsCurrency }
export { extractAdditionalTermsNotes }

export const FINAL_TERMS_CURRENCIES: readonly CurrencyCode[] = [
  'USD',
  'EUR',
  'AMD',
  'GEL',
  'RUB',
]

/** Lifecycle fields used by Final Terms UI (subset of AdRequest). */
export type DealTermsFields = Pick<
  AdRequest,
  | 'status'
  | 'terms_status'
  | 'content_mode'
  | 'placements_count'
  | 'placement_start_at'
  | 'placement_end_at'
  | 'final_price'
  | 'final_price_currency'
  | 'final_terms'
  | 'final_terms_proposed_by'
  | 'final_terms_proposed_at'
  | 'final_terms_accepted_at'
  | 'budget'
  | 'posts_count'
>

export type FinalTermsFormValues = {
  contentMode: ContentMode
  placementsCount: number
  placementStartAt: string
  placementEndAt: string
  finalPrice: number
  finalPriceCurrency: CurrencyCode
  additionalTerms: string
}

export type FinalTermsUiState =
  | 'none'
  | 'proposed_by_self'
  | 'proposed_by_other'
  | 'accepted'
  | 'locked'

export function normalizeTermsStatus(raw: TermsStatus | string | null | undefined): TermsStatus {
  const value = raw ?? 'none'
  if (value === 'proposed' || value === 'accepted' || value === 'locked') return value
  return 'none'
}

export function normalizeContentMode(raw: ContentMode | string | null | undefined): ContentMode {
  return raw === 'creator_creates' ? 'creator_creates' : 'advertiser_provides'
}

export function normalizeDealCurrency(raw: string | null | undefined): CurrencyCode {
  return FINAL_TERMS_CURRENCIES.includes(raw as CurrencyCode) ? (raw as CurrencyCode) : 'USD'
}

export function shouldShowFinalTermsSection(dealStatus: string | null | undefined): boolean {
  const status = normalizeDealStatus(dealStatus ?? 'new')
  return !['new', 'rejected', 'cancelled'].includes(status)
}

export function getFinalTermsUiState(deal: Partial<DealTermsFields>, currentUserId: string): FinalTermsUiState {
  const termsStatus = normalizeTermsStatus(deal.terms_status)
  if (termsStatus === 'locked') return 'locked'
  if (termsStatus === 'accepted') return 'accepted'
  if (termsStatus === 'proposed') {
    return deal.final_terms_proposed_by === currentUserId ? 'proposed_by_self' : 'proposed_by_other'
  }
  return 'none'
}

export function getFinalTermsStatusLabel(state: FinalTermsUiState): string {
  switch (state) {
    case 'none':
      return 'Не согласованы'
    case 'proposed_by_self':
      return 'Ожидание ответа'
    case 'proposed_by_other':
      return 'Предложены контрагентом'
    case 'accepted':
      return 'Согласованы'
    case 'locked':
      return 'Зафиксированы'
  }
}

export function getContentModeLabel(mode: ContentMode | null | undefined): string {
  if (mode === 'creator_creates') {
    return 'Автор готовит контент на основе брифа рекламодателя.'
  }
  return 'Рекламодатель предоставляет готовый рекламный контент.'
}

export function getContentModeShort(mode: ContentMode | null | undefined): string {
  return mode === 'creator_creates' ? 'Автор готовит контент' : 'Рекламодатель предоставляет контент'
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function buildFinalTermsFormDefaults(deal: Partial<DealTermsFields>): FinalTermsFormValues {
  return {
    contentMode: normalizeContentMode(deal.content_mode),
    placementsCount: Math.max(1, deal.placements_count ?? deal.posts_count ?? 1),
    placementStartAt: toDateInputValue(deal.placement_start_at),
    placementEndAt: toDateInputValue(deal.placement_end_at),
    finalPrice: deal.final_price ?? deal.budget ?? 0,
    finalPriceCurrency: normalizeDealCurrency(deal.final_price_currency),
    additionalTerms: extractAdditionalTermsNotes(deal.final_terms),
  }
}

export function buildFinalTermsFormFromDeal(deal: Partial<DealTermsFields>): FinalTermsFormValues {
  return buildFinalTermsFormDefaults(deal)
}

export function validateFinalTermsForm(values: FinalTermsFormValues): string | null {
  if (values.placementsCount < 1 || !Number.isFinite(values.placementsCount)) {
    return 'Количество размещений должно быть не меньше 1'
  }
  if (values.finalPrice < 0 || !Number.isFinite(values.finalPrice)) {
    return 'Цена не может быть отрицательной'
  }
  if (!FINAL_TERMS_CURRENCIES.includes(values.finalPriceCurrency)) {
    return 'Выберите поддерживаемую валюту'
  }
  if (!values.contentMode) {
    return 'Выберите тип контента'
  }
  if (values.placementStartAt && values.placementEndAt) {
    if (new Date(values.placementEndAt).getTime() < new Date(values.placementStartAt).getTime()) {
      return 'Дата окончания не может быть раньше даты начала'
    }
  }
  return null
}

export function formValuesToProposalPayload(values: FinalTermsFormValues) {
  const notes = values.additionalTerms.trim()
  return {
    contentMode: values.contentMode,
    placementsCount: values.placementsCount,
    placementStartAt: values.placementStartAt || null,
    placementEndAt: values.placementEndAt || null,
    finalPrice: values.finalPrice,
    finalPriceCurrency: values.finalPriceCurrency,
    finalTerms: notes ? { notes } : null,
  }
}

export function canShowProposeAction(state: FinalTermsUiState): boolean {
  return state === 'none' || state === 'proposed_by_self' || state === 'proposed_by_other'
}

export function canShowAcceptAction(state: FinalTermsUiState): boolean {
  return state === 'proposed_by_other'
}

export function isFinalTermsReadOnly(state: FinalTermsUiState): boolean {
  return state === 'accepted' || state === 'locked'
}

export const STALE_TERMS_MESSAGE =
  'Условия изменились. Ознакомьтесь с последним предложением.'

export function hasPartialTermsData(deal: Partial<DealTermsFields>): boolean {
  return (
    deal.content_mode != null ||
    deal.placements_count != null ||
    deal.final_price != null ||
    normalizeTermsStatus(deal.terms_status) !== 'none'
  )
}

export function shouldShowTermsSummary(deal: Partial<DealTermsFields>, state: FinalTermsUiState): boolean {
  if (isFinalTermsReadOnly(state)) return true
  if (state === 'proposed_by_self' || state === 'proposed_by_other') return true
  return state === 'none' && hasPartialTermsData(deal)
}

export function normalizeContentStatus(raw: ContentStatus | string | null | undefined): ContentStatus {
  if (
    raw === 'pending' ||
    raw === 'submitted' ||
    raw === 'changes_requested' ||
    raw === 'approved'
  ) {
    return raw
  }
  return 'not_required'
}

/** Fills Phase 0 defaults when reading legacy rows that predate migration columns. */
export function coerceAdRequestRow(row: Record<string, unknown>): AdRequest {
  return {
    ...(row as unknown as AdRequest),
    terms_status: normalizeTermsStatus(row.terms_status as TermsStatus | string | undefined),
    content_status: normalizeContentStatus(row.content_status as ContentStatus | string | undefined),
    content_mode:
      row.content_mode === 'creator_creates' || row.content_mode === 'advertiser_provides'
        ? row.content_mode
        : null,
    budget_currency: FINAL_TERMS_CURRENCIES.includes(row.budget_currency as CurrencyCode)
      ? (row.budget_currency as CurrencyCode)
      : null,
    final_price_currency: FINAL_TERMS_CURRENCIES.includes(row.final_price_currency as CurrencyCode)
      ? (row.final_price_currency as CurrencyCode)
      : null,
  }
}