import { describe, expect, it } from 'vitest'
import type { AdRequest, DealMaterial } from '@/lib/database.types'
import { canStartFinalReview, isLegacyLifecycleDeal } from '@/lib/deal-lifecycle'
import { coerceAdRequestRow } from '@/lib/final-terms-ui'
import { buildLifecycleContextFromAdRequest } from '@/lib/placements-ui'
import {
  canAdvertiserApproveContent,
  canAdvertiserEditAdvertiserProvidesMaterial,
  canAdvertiserEditCreatorBrief,
  canAdvertiserRequestContentChanges,
  canCreatorSubmitContent,
  coerceMaterial,
  getContentNextActionMessage,
  shouldShowContentSection,
  showCreatorApprovalWorkflow,
  validateChangeRequestComment,
  validateCreatorSubmission,
} from '@/lib/deal-content-ui'

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

function material(overrides: Partial<DealMaterial> = {}): DealMaterial {
  return {
    id: 'mat-1',
    ad_request_id: 'deal-1',
    body_text: 'Brief text',
    destination_url: 'https://example.com',
    attachments: null,
    creator_submission_text: null,
    change_request_comment: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

describe('shouldShowContentSection', () => {
  it('legacy deal does not enter new content workflow', () => {
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
    expect(shouldShowContentSection(request, [])).toBe(false)
  })

  it('shows for new lifecycle deal with accepted terms and content_mode', () => {
    expect(shouldShowContentSection(acceptedDeal(), [])).toBe(true)
  })

  it('hides before terms accepted', () => {
    expect(shouldShowContentSection(acceptedDeal({ terms_status: 'proposed' }), [])).toBe(false)
  })
})

describe('advertiser_provides flow', () => {
  const request = acceptedDeal({ content_mode: 'advertiser_provides', content_status: 'not_required' })

  it('advertiser can edit material', () => {
    expect(canAdvertiserEditAdvertiserProvidesMaterial(request, 'advertiser')).toBe(true)
  })

  it('creator cannot edit material', () => {
    expect(canAdvertiserEditAdvertiserProvidesMaterial(request, 'creator')).toBe(false)
  })

  it('does not show creator approval workflow', () => {
    expect(showCreatorApprovalWorkflow(request)).toBe(false)
  })

  it('advertiser waiting state when material missing', () => {
    expect(getContentNextActionMessage(request, [], 'advertiser', null)).toContain('Добавьте')
    expect(getContentNextActionMessage(request, [], 'creator', null)).toContain('Ожидание материала')
  })

  it('creator sees read-only when material exists', () => {
    expect(canAdvertiserEditAdvertiserProvidesMaterial(request, 'creator')).toBe(false)
    expect(getContentNextActionMessage(request, [], 'creator', material())).toContain('готов')
  })
})

describe('creator_creates flow', () => {
  const pending = acceptedDeal({
    content_mode: 'creator_creates',
    content_status: 'pending',
  })

  it('advertiser can provide brief while pending', () => {
    expect(canAdvertiserEditCreatorBrief(pending, 'advertiser')).toBe(true)
  })

  it('creator can submit while pending', () => {
    expect(canCreatorSubmitContent(pending, [], 'creator')).toBe(true)
  })

  it('creator cannot approve', () => {
    const submitted = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'submitted',
    })
    expect(canAdvertiserApproveContent(submitted, [], 'creator')).toBe(false)
  })

  it('advertiser can approve submitted content', () => {
    const submitted = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'submitted',
    })
    expect(canAdvertiserApproveContent(submitted, [], 'advertiser')).toBe(true)
  })

  it('advertiser can request changes on submitted content', () => {
    const submitted = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'submitted',
    })
    expect(canAdvertiserRequestContentChanges(submitted, [], 'advertiser')).toBe(true)
  })

  it('blank change request rejected client-side', () => {
    expect(validateChangeRequestComment('   ')).toBeTruthy()
  })

  it('blank creator submission rejected client-side', () => {
    expect(validateCreatorSubmission('  ')).toBeTruthy()
  })

  it('creator can resubmit after changes requested', () => {
    const changes = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'changes_requested',
    })
    expect(canCreatorSubmitContent(changes, [], 'creator')).toBe(true)
    expect(canAdvertiserEditCreatorBrief(changes, 'advertiser')).toBe(true)
  })

  it('advertiser cannot edit brief while submitted', () => {
    const submitted = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'submitted',
    })
    expect(canAdvertiserEditCreatorBrief(submitted, 'advertiser')).toBe(false)
  })

  it('approved state is read-only for brief edits', () => {
    const approved = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'approved',
    })
    expect(canAdvertiserEditCreatorBrief(approved, 'advertiser')).toBe(false)
    expect(canCreatorSubmitContent(approved, [], 'creator')).toBe(false)
    expect(getContentNextActionMessage(approved, [], 'advertiser', material({
      creator_submission_text: 'Final ad copy',
    }))).toContain('готов')
  })
})

describe('coerceMaterial', () => {
  it('handles missing row', () => {
    expect(coerceMaterial(null)).toBeNull()
  })

  it('coerces malformed legacy values safely', () => {
    const row = coerceMaterial({
      id: 'm1',
      ad_request_id: 'd1',
      body_text: 123,
      destination_url: undefined,
      creator_submission_text: null,
    })
    expect(row?.body_text).toBe('123')
    expect(row?.destination_url).toBeNull()
  })
})

describe('final review interaction', () => {
  it('N/N + pending content does not start final review', () => {
    const request = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'pending',
      placements_count: 2,
    })
    const ctx = buildLifecycleContextFromAdRequest(request, [
      {
        id: 'p1',
        ad_request_id: 'deal-1',
        placement_index: 1,
        status: 'published',
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
      },
      {
        id: 'p2',
        ad_request_id: 'deal-1',
        placement_index: 2,
        status: 'published',
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
      },
    ])
    expect(canStartFinalReview(ctx)).toBe(false)
  })

  it('N/N + content approved can start final review', () => {
    const request = acceptedDeal({
      content_mode: 'creator_creates',
      content_status: 'approved',
      placements_count: 2,
    })
    const ctx = buildLifecycleContextFromAdRequest(request, [
      {
        id: 'p1',
        ad_request_id: 'deal-1',
        placement_index: 1,
        status: 'published',
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
      },
      {
        id: 'p2',
        ad_request_id: 'deal-1',
        placement_index: 2,
        status: 'published',
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
      },
    ])
    expect(canStartFinalReview(ctx)).toBe(true)
  })
})
