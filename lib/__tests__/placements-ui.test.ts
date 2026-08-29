import { describe, expect, it } from 'vitest'
import { isConcurrentMutationError } from '@/lib/deal-api-client'
import type { AdRequest } from '@/lib/database.types'
import {
  buildLifecycleContextFromAdRequest,
  canAdvertiserReportIssue,
  canCreatorPublishPlacement,
  canInitializePlacements,
  coercePlacements,
  formatPlacementViews,
  getFinalReviewBanner,
  getNextPublishablePlacementIndex,
  getPlacementProgressPercent,
  getPublishedPlacementsCount,
  shouldUsePlacementsWorkflow,
  supportsPerPlacementApprovalInUi,
} from '@/lib/placements-ui'
import { isLegacyLifecycleDeal } from '@/lib/deal-lifecycle'
import { coerceAdRequestRow } from '@/lib/final-terms-ui'

function acceptedDeal(overrides: Partial<AdRequest> = {}): AdRequest {
  return coerceAdRequestRow({
    id: 'deal-1',
    status: 'in_progress',
    terms_status: 'accepted',
    content_mode: 'advertiser_provides',
    content_status: 'not_required',
    placements_count: 3,
    posts_count: 1,
    advertiser_name: 'A',
    advertiser_contact: 'c',
    message: 'm',
    created_at: '2026-01-01',
    ...overrides,
  } as Record<string, unknown>)
}

describe('shouldUsePlacementsWorkflow', () => {
  it('legacy deal does not initialize placements workflow', () => {
    const request = coerceAdRequestRow({
      id: 'legacy',
      status: 'in_progress',
      terms_status: 'none',
      posts_count: 1,
      advertiser_name: 'A',
      advertiser_contact: 'c',
      message: 'm',
      created_at: '2026-01-01',
    } as Record<string, unknown>)
    const ctx = buildLifecycleContextFromAdRequest(request, [])
    expect(isLegacyLifecycleDeal(ctx)).toBe(true)
    expect(shouldUsePlacementsWorkflow(request, [])).toBe(false)
  })

  it('new lifecycle deal with accepted terms uses placements workflow', () => {
    expect(shouldUsePlacementsWorkflow(acceptedDeal(), [])).toBe(true)
  })
})

describe('initialization state', () => {
  it('0/N shows initialize when terms accepted and no rows', () => {
    const request = acceptedDeal({ placements_count: 3 })
    expect(canInitializePlacements(request, [])).toBe(true)
  })

  it('does not initialize before terms accepted', () => {
    const request = acceptedDeal({ terms_status: 'proposed', placements_count: 3 })
    expect(canInitializePlacements(request, [])).toBe(false)
  })
})

describe('placement progress and ordering', () => {
  const request = acceptedDeal({ placements_count: 3 })

  it('orders placements by placement_index', () => {
    const rows = coercePlacements([
      { id: 'p2', ad_request_id: 'd1', placement_index: 2, status: 'scheduled', created_at: '', updated_at: '' },
      { id: 'p1', ad_request_id: 'd1', placement_index: 1, status: 'published', created_at: '', updated_at: '' },
    ])
    expect(rows.map((p) => p.placement_index)).toEqual([1, 2])
  })

  it('1/3 progress', () => {
    const placements = coercePlacements([
      { id: 'p1', ad_request_id: 'd1', placement_index: 1, status: 'published', created_at: '', updated_at: '' },
      { id: 'p2', ad_request_id: 'd1', placement_index: 2, status: 'scheduled', created_at: '', updated_at: '' },
      { id: 'p3', ad_request_id: 'd1', placement_index: 3, status: 'scheduled', created_at: '', updated_at: '' },
    ])
    expect(getPublishedPlacementsCount(request, placements)).toBe(1)
    expect(getPlacementProgressPercent(request, placements)).toBe(33)
  })

  it('3/3 progress counts issue_reported as published', () => {
    const placements = coercePlacements([
      { id: 'p1', ad_request_id: 'd1', placement_index: 1, status: 'published', created_at: '', updated_at: '' },
      { id: 'p2', ad_request_id: 'd1', placement_index: 2, status: 'published', created_at: '', updated_at: '' },
      { id: 'p3', ad_request_id: 'd1', placement_index: 3, status: 'issue_reported', created_at: '', updated_at: '' },
    ])
    expect(getPublishedPlacementsCount(request, placements)).toBe(3)
    expect(getPlacementProgressPercent(request, placements)).toBe(100)
  })
})

describe('role actions', () => {
  const request = acceptedDeal({ placements_count: 2, status: 'in_progress' })
  const placements = coercePlacements([
    { id: 'p1', ad_request_id: 'd1', placement_index: 1, status: 'published', created_at: '', updated_at: '' },
    { id: 'p2', ad_request_id: 'd1', placement_index: 2, status: 'scheduled', created_at: '', updated_at: '' },
  ])

  it('creator sees publish action for next eligible placement', () => {
    expect(getNextPublishablePlacementIndex(request, placements)).toBe(2)
    expect(canCreatorPublishPlacement(request, placements, 2)).toBe(true)
    expect(canCreatorPublishPlacement(request, placements, 1)).toBe(false)
  })

  it('advertiser does not see publish action', () => {
    expect(canCreatorPublishPlacement(request, placements, 2)).toBe(true)
  })

  it('advertiser sees report issue only for published placement', () => {
    expect(canAdvertiserReportIssue(request, placements, 1)).toBe(true)
    expect(canAdvertiserReportIssue(request, placements, 2)).toBe(false)
  })

  it('creator cannot report advertiser issue through UI helpers', () => {
    expect(canAdvertiserReportIssue(request, placements, 1)).toBe(true)
    expect(supportsPerPlacementApprovalInUi()).toBe(false)
  })
})

describe('final review and content dependency', () => {
  it('final review banner only when server final_review_started_at is set', () => {
    const request = acceptedDeal({
      placements_count: 1,
      final_review_started_at: '2026-02-01T00:00:00Z',
      all_placements_published_at: '2026-02-01T00:00:00Z',
    })
    const placements = coercePlacements([
      { id: 'p1', ad_request_id: 'd1', placement_index: 1, status: 'published', created_at: '', updated_at: '' },
    ])
    expect(getFinalReviewBanner(request, placements)?.subtitle).toMatch(/финальной проверки/)
  })

  it('N/N without content approval does not fake final review', () => {
    const request = acceptedDeal({
      placements_count: 1,
      content_mode: 'creator_creates',
      content_status: 'submitted',
      final_review_started_at: null,
    })
    const placements = coercePlacements([
      { id: 'p1', ad_request_id: 'd1', placement_index: 1, status: 'published', created_at: '', updated_at: '' },
    ])
    const banner = getFinalReviewBanner(request, placements)
    expect(banner?.title).toMatch(/Все размещения опубликованы/)
    expect(banner?.subtitle).toMatch(/одобрение контента/)
    expect(request.final_review_started_at).toBeNull()
  })
})

describe('issue_reported warning', () => {
  it('issue_reported placement blocks completion readiness via lifecycle', () => {
    const request = acceptedDeal({ placements_count: 1 })
    const placements = coercePlacements([
      {
        id: 'p1',
        ad_request_id: 'd1',
        placement_index: 1,
        status: 'issue_reported',
        issue_comment: 'Wrong link',
        created_at: '',
        updated_at: '',
      },
    ])
    expect(canAdvertiserReportIssue(request, placements, 1)).toBe(false)
  })
})

describe('malformed data and analytics', () => {
  it('null analytics never become zero', () => {
    expect(formatPlacementViews(null)).toBeNull()
    expect(formatPlacementViews(undefined)).toBeNull()
  })

  it('malformed placement rows do not crash coerce', () => {
    expect(coercePlacements([{ foo: 'bar' }, null, 1])).toEqual([])
  })
})

describe('409 handling helper', () => {
  it('409 maps to concurrent mutation helper', () => {
    expect(isConcurrentMutationError({ ok: false, error: 'conflict', status: 409 })).toBe(true)
    expect(isConcurrentMutationError({ ok: false, error: 'bad', status: 400 })).toBe(false)
  })
})

describe('no per-placement approval', () => {
  it('UI does not expose approval actions', () => {
    expect(supportsPerPlacementApprovalInUi()).toBe(false)
  })
})
