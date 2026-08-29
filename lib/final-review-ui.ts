import type { AdRequest, DealMaterial, DealPlacement } from '@/lib/database.types'
import {
  canCompleteDeal,
  findIssueReportedPlacementIndex,
  getExpectedPlacementsCount,
  isInFinalReview,
  isLegacyLifecycleDeal,
  isLegacySubmittedReview,
  normalizeDealStatus,
} from '@/lib/deal-lifecycle'
import {
  getContentNextActionMessage,
  hasAdvertiserMaterial,
  shouldShowContentSection,
} from '@/lib/deal-content-ui'
import {
  buildLifecycleContextFromAdRequest,
  getNextPublishablePlacementIndex,
  hasPlacementIssueBlockingCompletion,
  shouldUsePlacementsWorkflow,
} from '@/lib/placements-ui'
import { getFinalTermsUiState, normalizeTermsStatus } from '@/lib/final-terms-ui'

export type AutoCompleteRemaining = {
  expired: boolean
  label: string | null
  urgent: boolean
}

export function getAutoCompleteRemaining(
  deadline: string | null | undefined,
  now: Date = new Date(),
): AutoCompleteRemaining {
  if (!deadline) {
    return { expired: false, label: null, urgent: false }
  }

  const end = new Date(deadline).getTime()
  if (Number.isNaN(end)) {
    return { expired: false, label: null, urgent: false }
  }

  const diffMs = end - now.getTime()
  if (diffMs <= 0) {
    return { expired: true, label: 'Срок автоподтверждения истёк', urgent: true }
  }

  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
  return {
    expired: false,
    label: `Автоподтверждение через ${hours}ч ${minutes}м`,
    urgent: hours < 6,
  }
}

export function shouldShowNewLifecycleFinalReview(
  request: AdRequest,
  placements: DealPlacement[],
): boolean {
  if (!shouldUsePlacementsWorkflow(request, placements)) return false
  const status = normalizeDealStatus(request.status)
  if (request.final_review_started_at) return true
  return ['completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(status)
}

export function canAdvertiserConfirmCompletion(
  request: AdRequest,
  placements: DealPlacement[],
): boolean {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  const status = normalizeDealStatus(request.status)
  if (status === 'completed' || status === 'disputed') return false
  if (!request.final_review_started_at) return false
  return canCompleteDeal(ctx)
}

export function canAdvertiserOpenDispute(
  request: AdRequest,
  placements: DealPlacement[],
): boolean {
  const status = normalizeDealStatus(request.status)
  if (status === 'completed' || status === 'disputed') return false
  if (!request.final_review_started_at) return false
  return isInFinalReview(buildLifecycleContextFromAdRequest(request, placements))
}

export function getDisputeOutcomeMessage(status: string): string | null {
  switch (normalizeDealStatus(status)) {
    case 'disputed':
      return 'Спор открыт — сделка ожидает рассмотрения'
    case 'resolved_creator':
      return 'Спор решён в пользу автора'
    case 'resolved_advertiser':
      return 'Спор решён в пользу рекламодателя'
    default:
      return null
  }
}

export function getDealNextAction(
  request: AdRequest,
  placements: DealPlacement[],
  material: DealMaterial | null,
  role: 'creator' | 'advertiser',
): string {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  const status = normalizeDealStatus(request.status)

  if (status === 'completed') {
    return 'Сделка завершена'
  }

  const disputeMessage = getDisputeOutcomeMessage(status)
  if (disputeMessage) {
    return disputeMessage
  }

  if (isLegacyLifecycleDeal(ctx)) {
    if (isLegacySubmittedReview(ctx)) {
      return role === 'advertiser'
        ? 'Рекламодателю нужно проверить выполнение'
        : 'Ожидание проверки рекламодателем'
    }
    if (status === 'in_progress') {
      return role === 'creator' ? 'Автор выполняет заказ' : 'Автор выполняет заказ'
    }
    if (status === 'accepted') {
      return role === 'creator' ? 'Автор может начать работу' : 'Ожидание начала работы'
    }
    return 'Сделка в процессе'
  }

  const termsStatus = normalizeTermsStatus(request.terms_status)
  if (termsStatus !== 'accepted' && termsStatus !== 'locked') {
    return 'Нужно согласовать финальные условия'
  }

  const issueIndex = findIssueReportedPlacementIndex(ctx)
  if (issueIndex != null) {
    return role === 'creator'
      ? `Автору нужно исправить размещение ${issueIndex}`
      : `Ожидание исправления размещения ${issueIndex}`
  }

  if (request.final_review_started_at) {
    if (hasPlacementIssueBlockingCompletion(request, placements)) {
      return 'Завершение заблокировано проблемой с размещением'
    }
    return role === 'advertiser'
      ? 'Рекламодателю нужно проверить выполненную сделку'
      : 'Ожидание финальной проверки рекламодателем'
  }

  if (shouldShowContentSection(request, placements)) {
    const contentAction = getContentNextActionMessage(request, placements, role, material)
    if (request.content_mode === 'creator_creates') {
      if (request.content_status === 'pending' && role === 'creator') {
        return 'Автору нужно подготовить контент'
      }
      if (request.content_status === 'submitted' && role === 'advertiser') {
        return 'Рекламодателю нужно проверить контент'
      }
      if (request.content_status === 'changes_requested' && role === 'creator') {
        return 'Автору нужно доработать контент'
      }
      if (
        request.content_status !== 'approved' &&
        (request.content_status === 'pending' ||
          request.content_status === 'submitted' ||
          request.content_status === 'changes_requested')
      ) {
        return contentAction
      }
    }
    if (request.content_mode === 'advertiser_provides' && !hasAdvertiserMaterial(material)) {
      return role === 'advertiser'
        ? 'Рекламодателю нужно предоставить рекламный материал'
        : 'Ожидание материала от рекламодателя'
    }
  }

  if (shouldUsePlacementsWorkflow(request, placements)) {
    const expected = getExpectedPlacementsCount(ctx)
    const nextIndex = getNextPublishablePlacementIndex(request, placements)
    if (nextIndex != null && expected >= 1) {
      return role === 'creator'
        ? `Автору нужно опубликовать размещение ${nextIndex} из ${expected}`
        : `Ожидание публикации размещения ${nextIndex} из ${expected}`
    }
  }

  return role === 'creator' ? 'Следующий шаг зависит от условий сделки' : 'Следующий шаг зависит от условий сделки'
}

export function getFinalReviewStatusLabel(request: AdRequest): string {
  const status = normalizeDealStatus(request.status)
  if (status === 'completed') return 'Сделка завершена'
  if (status === 'disputed') return 'Спор открыт'
  if (status === 'resolved_creator') return 'Спор решён в пользу автора'
  if (status === 'resolved_advertiser') return 'Спор решён в пользу рекламодателя'
  return 'Финальная проверка'
}

export function isFinalReviewTerminal(request: AdRequest): boolean {
  const status = normalizeDealStatus(request.status)
  return ['completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(status)
}

export function canShowFinalReviewCountdown(request: AdRequest): boolean {
  const status = normalizeDealStatus(request.status)
  return Boolean(request.auto_complete_deadline) && !['completed', 'disputed'].includes(status)
}

export function getFinalTermsActionHint(
  request: AdRequest,
  currentUserId: string,
): string | null {
  const uiState = getFinalTermsUiState(request, currentUserId)
  if (uiState === 'none') return 'Предложите финальные условия'
  if (uiState === 'proposed_by_self') return 'Ожидание ответа второй стороны'
  if (uiState === 'proposed_by_other') return 'Примите или измените условия'
  return null
}
