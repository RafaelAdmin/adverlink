import type { AdRequest, DealMaterial } from '@/lib/database.types'
import type { ContentMode, ContentStatus } from '@/lib/deal-lifecycle'
import {
  canApproveCreatorContent,
  canRequestContentChanges,
  canSubmitCreatorContent,
  isLegacyLifecycleDeal,
  type DealLifecycleContext,
} from '@/lib/deal-lifecycle'
import { buildLifecycleContextFromAdRequest } from '@/lib/placements-ui'
import type { DealPlacement } from '@/lib/database.types'

export type ContentFormValues = {
  bodyText: string
  destinationUrl: string
}

export function coerceMaterialRow(row: Record<string, unknown>): DealMaterial | null {
  if (!row.id) return null
  return {
    id: String(row.id),
    ad_request_id: String(row.ad_request_id ?? ''),
    body_text: row.body_text == null ? null : String(row.body_text),
    destination_url: row.destination_url == null ? null : String(row.destination_url),
    attachments: row.attachments ?? null,
    creator_submission_text:
      row.creator_submission_text == null ? null : String(row.creator_submission_text),
    change_request_comment:
      row.change_request_comment == null ? null : String(row.change_request_comment),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

export function coerceMaterial(rows: unknown): DealMaterial | null {
  if (!rows || typeof rows !== 'object') return null
  return coerceMaterialRow(rows as Record<string, unknown>)
}

export function shouldShowContentSection(
  request: AdRequest,
  placements: DealPlacement[] = [],
): boolean {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  if (isLegacyLifecycleDeal(ctx)) return false
  if (request.content_mode !== 'advertiser_provides' && request.content_mode !== 'creator_creates') {
    return false
  }
  const termsReady =
    request.terms_status === 'accepted' || request.terms_status === 'locked'
  return termsReady
}

export function getContentModeLabel(mode: ContentMode | null): string {
  switch (mode) {
    case 'advertiser_provides':
      return 'Рекламодатель предоставляет материал'
    case 'creator_creates':
      return 'Автор создаёт контент'
    default:
      return '—'
  }
}

export function getCreatorContentStatusLabel(status: ContentStatus): string {
  switch (status) {
    case 'pending':
      return 'Ожидает подготовки'
    case 'submitted':
      return 'На проверке'
    case 'changes_requested':
      return 'Нужны правки'
    case 'approved':
      return 'Одобрено'
    case 'not_required':
      return 'Не требуется'
    default:
      return '—'
  }
}

export function getContentNextActionMessage(
  request: AdRequest,
  placements: DealPlacement[],
  role: 'creator' | 'advertiser',
  material: DealMaterial | null = null,
): string {
  const mode = request.content_mode

  if (mode === 'advertiser_provides') {
    const saved = hasAdvertiserMaterial(material)
    if (role === 'advertiser') {
      return saved ? 'Материал сохранён' : 'Добавьте рекламный материал'
    }
    return saved
      ? 'Материал готов к публикации'
      : 'Ожидание материала от рекламодателя'
  }

  if (mode !== 'creator_creates') return ''

  switch (request.content_status) {
    case 'pending':
      return role === 'creator'
        ? 'Автору нужно подготовить контент'
        : 'Ожидание контента от автора'
    case 'submitted':
      return role === 'advertiser'
        ? 'Рекламодателю нужно проверить контент'
        : 'Ожидание одобрения рекламодателем'
    case 'changes_requested':
      return role === 'creator'
        ? 'Автору нужно доработать контент'
        : 'Ожидание доработки от автора'
    case 'approved':
      return 'Контент готов к публикации'
    default:
      return ''
  }
}

export function hasAdvertiserMaterial(material: DealMaterial | null): boolean {
  return Boolean(material?.body_text?.trim())
}

export function hasCreatorSubmission(material: DealMaterial | null): boolean {
  return Boolean(material?.creator_submission_text?.trim())
}

export function canAdvertiserEditAdvertiserProvidesMaterial(
  request: AdRequest,
  role: 'creator' | 'advertiser',
): boolean {
  if (role !== 'advertiser') return false
  return request.content_mode === 'advertiser_provides'
}

export function canAdvertiserEditCreatorBrief(
  request: AdRequest,
  role: 'creator' | 'advertiser',
): boolean {
  if (role !== 'advertiser') return false
  if (request.content_mode !== 'creator_creates') return false
  return request.content_status === 'pending' || request.content_status === 'changes_requested'
}

export function canCreatorSubmitContent(
  request: AdRequest,
  placements: DealPlacement[],
  role: 'creator' | 'advertiser',
): boolean {
  if (role !== 'creator') return false
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  return canSubmitCreatorContent(ctx)
}

export function canAdvertiserApproveContent(
  request: AdRequest,
  placements: DealPlacement[],
  role: 'creator' | 'advertiser',
): boolean {
  if (role !== 'advertiser') return false
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  return canApproveCreatorContent(ctx)
}

export function canAdvertiserRequestContentChanges(
  request: AdRequest,
  placements: DealPlacement[],
  role: 'creator' | 'advertiser',
): boolean {
  if (role !== 'advertiser') return false
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  return canRequestContentChanges(ctx)
}

export function isContentApprovedReadOnly(
  request: AdRequest,
): boolean {
  return request.content_mode === 'creator_creates' && request.content_status === 'approved'
}

export function materialToFormValues(material: DealMaterial | null): ContentFormValues {
  return {
    bodyText: material?.body_text?.trim() ?? '',
    destinationUrl: material?.destination_url?.trim() ?? '',
  }
}

export function validateNonBlankText(value: string, fieldLabel: string): string | null {
  if (!value.trim()) return `${fieldLabel} не может быть пустым`
  return null
}

export function validateDestinationUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    if (!url.hostname.includes('.')) {
      return 'Укажите корректный URL'
    }
    return null
  } catch {
    return 'Укажите корректный URL'
  }
}

export function validateAdvertiserContentForm(values: ContentFormValues): string | null {
  const bodyError = validateNonBlankText(values.bodyText, 'Текст')
  if (bodyError) return bodyError
  return validateDestinationUrl(values.destinationUrl)
}

export function validateCreatorSubmission(text: string): string | null {
  return validateNonBlankText(text, 'Текст контента')
}

export function validateChangeRequestComment(comment: string): string | null {
  return validateNonBlankText(comment, 'Комментарий')
}

export function showCreatorApprovalWorkflow(request: AdRequest): boolean {
  return request.content_mode === 'creator_creates'
}

export function buildContentLifecycleContext(
  request: AdRequest,
  placements: DealPlacement[],
): DealLifecycleContext {
  return buildLifecycleContextFromAdRequest(request, placements)
}
