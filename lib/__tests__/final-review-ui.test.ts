import { describe, expect, it } from 'vitest'
import type { AdRequest, DealMaterial, DealPlacement } from '@/lib/database.types'
import { canCompleteDeal, canResolvePlacementIssue, canTransitionPlacementStatus } from '@/lib/deal-lifecycle'
import { coerceAdRequestRow } from '@/lib/final-terms-ui'
import { buildLifecycleContextFromAdRequest, canCreatorResolveIssue } from '@/lib/placements-ui'
import {
  canAdvertiserConfirmCompletion,
  canAdvertiserOpenDispute,
  getAutoCompleteRemaining,
  getDealNextAction,
  getDisputeOutcomeMessage,
  shouldShowNewLifecycleFinalReview,
} from '@/lib/final-review-ui'

function acceptedDeal(overrides: Partial<AdRequest> = {}): AdRequest {
  return coerceAdRequestRow({
    id: 'deal-1',
    status: 'in_progress',
    terms_status: 'accepted',
    content_mode: 'advertiser_provides',
    content_status: 'not_required',
    placements_count: 2,
    posts_count: 1,
    advertiser_name: 'A',
    advertiser_contact: 'c',
    message: 'm',
    created_at: '2026-01-01',
    ...overrides,
  } as Record<string, unknown>)
}

function placement(index: number, status: DealPlacement['status']): DealPlacement {
  return {
    id: `p${index}`,
    ad_request_id: 'deal-1',
    placement_index: index,
    status,
    scheduled_at: null,
    published_at: null,
    proof_url: null,
    telegram_message_id: null,
    telegram_post_id: null,
    issue_reported_at: null,
    issue_reported_by: null,
    issue_comment: null,
    created_at: '',
    updated_at: '',
  }
}

describe('final review visibility', () => {
  it('only shows when final_review_started_at is set or terminal outcome', () => {
    const request = acceptedDeal({ final_review_started_at: '2026-03-01T12:00:00Z' })
    expect(shouldShowNewLifecycleFinalReview(request, [placement(1, 'published')])).toBe(true)
  })

  it('does not show before final review for in-progress deal', () => {
    const request = acceptedDeal()
    expect(shouldShowNewLifecycleFinalReview(request, [placement(1, 'scheduled')])).toBe(false)
  })
})

describe('final review actions', () => {
  const inReview = acceptedDeal({
    final_review_started_at: '2026-03-01T12:00:00Z',
    auto_complete_deadline: '2026-03-03T12:00:00Z',
  })
  const publishedPlacements = [placement(1, 'published'), placement(2, 'published')]

  it('advertiser sees confirm and dispute during final review', () => {
    expect(canAdvertiserConfirmCompletion(inReview, publishedPlacements)).toBe(true)
    expect(canAdvertiserOpenDispute(inReview, publishedPlacements)).toBe(true)
  })

  it('issue_reported disables confirm completion', () => {
    const withIssue = [
      placement(1, 'published'),
      { ...placement(2, 'issue_reported'), issue_comment: 'Wrong link' },
    ]
    expect(canAdvertiserConfirmCompletion(inReview, withIssue)).toBe(false)
  })
})

describe('auto-complete countdown display', () => {
  it('uses server deadline only', () => {
    const remaining = getAutoCompleteRemaining('2026-03-03T14:30:00Z', new Date('2026-03-03T12:00:00Z'))
    expect(remaining.expired).toBe(false)
    expect(remaining.label).toContain('2ч')
  })

  it('shows expired label without client-completing', () => {
    const remaining = getAutoCompleteRemaining('2026-03-01T12:00:00Z', new Date('2026-03-02T12:00:00Z'))
    expect(remaining.expired).toBe(true)
    expect(remaining.label).toContain('истёк')
  })

  it('handles null deadline safely', () => {
    expect(getAutoCompleteRemaining(null).label).toBeNull()
  })
})

describe('dispute outcomes', () => {
  it('renders honest dispute messages', () => {
    expect(getDisputeOutcomeMessage('disputed')).toContain('Спор открыт')
    expect(getDisputeOutcomeMessage('resolved_creator')).toContain('автора')
    expect(getDisputeOutcomeMessage('resolved_advertiser')).toContain('рекламодателя')
  })
})

describe('issue resolution lifecycle', () => {
  it('allows issue_reported to published transition', () => {
    expect(canTransitionPlacementStatus('issue_reported', 'published')).toBe(true)
  })

  it('creator can resolve issue_reported placement', () => {
    const request = acceptedDeal()
    const placements = [
      placement(1, 'published'),
      { ...placement(2, 'issue_reported'), issue_comment: 'bad' },
    ]
    expect(canCreatorResolveIssue(request, placements, 2)).toBe(true)
    expect(canCreatorResolveIssue(request, placements, 1)).toBe(false)
  })

  it('published placement without issue cannot resolve', () => {
    const request = acceptedDeal()
    const placements = [placement(1, 'published')]
    expect(canCreatorResolveIssue(request, placements, 1)).toBe(false)
  })

  it('issue blocks completion until resolved', () => {
    const request = acceptedDeal({
      final_review_started_at: '2026-03-01T12:00:00Z',
    })
    const ctx = buildLifecycleContextFromAdRequest(request, [
      placement(1, 'published'),
      { ...placement(2, 'issue_reported'), issue_comment: 'x' },
    ])
    expect(canCompleteDeal(ctx)).toBe(false)
    expect(canResolvePlacementIssue(ctx, 2)).toBe(true)
  })
})

describe('deal next action', () => {
  const material: DealMaterial = {
    id: 'm1',
    ad_request_id: 'deal-1',
    body_text: null,
    destination_url: null,
    attachments: null,
    creator_submission_text: null,
    change_request_comment: null,
    created_at: '',
    updated_at: '',
  }

  it('terms action when not accepted', () => {
    const request = acceptedDeal({ terms_status: 'proposed' })
    expect(getDealNextAction(request, [], material, 'advertiser')).toContain('условия')
  })

  it('advertiser material action', () => {
    const request = acceptedDeal({ terms_status: 'accepted' })
    expect(getDealNextAction(request, [], material, 'advertiser')).toContain('материал')
  })

  it('creator content action', () => {
    const request = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'pending',
    })
    expect(getDealNextAction(request, [], material, 'creator')).toContain('контент')
  })

  it('final review action for advertiser', () => {
    const request = acceptedDeal({
      final_review_started_at: '2026-03-01T12:00:00Z',
    })
    const placements = [placement(1, 'published'), placement(2, 'published')]
    expect(getDealNextAction(request, placements, material, 'advertiser')).toContain('проверить')
  })

  it('issue correction action for creator', () => {
    const request = acceptedDeal({ terms_status: 'accepted' })
    const placements = [{ ...placement(2, 'issue_reported'), issue_comment: 'x' }]
    expect(getDealNextAction(request, placements, material, 'creator')).toContain('исправить')
  })

  it('completed state', () => {
    const request = acceptedDeal({ status: 'completed' })
    expect(getDealNextAction(request, [], material, 'advertiser')).toContain('завершена')
  })

  it('disputed state', () => {
    const request = acceptedDeal({ status: 'disputed' })
    expect(getDealNextAction(request, [], material, 'advertiser')).toContain('Спор')
  })
})
