import {
  canLockTerms,
  isLegacyLifecycleDeal,
  normalizeDealStatus,
} from '@/lib/deal-lifecycle'
import {
  generateSimulatedPaymentReference,
  isDealPaymentComplete,
  isSimulatedPaymentsEnabled,
  resolveDealPaymentAmount,
  SIMULATED_PAYMENT_ENVIRONMENT,
  SIMULATED_PAYMENT_PROVIDER,
} from '@/lib/deal-payments'
import { DealActionError } from '@/lib/server/deal-errors'
import {
  getAdminClient,
  reloadDealBundle,
  type DealRecord,
} from '@/lib/server/deal-repository'

async function conditionalDealUpdate(
  dealId: string,
  update: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: (query: any) => any,
): Promise<boolean> {
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin.from('ad_requests').update(update).eq('id', dealId)
  query = match(query)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw new DealActionError(error.message, 500)
  return Boolean(data)
}

export type SimulatedPaymentValidation =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; reason: string; status: number }

export function validateSimulatedDealPayment(
  deal: DealRecord,
  advertiserId: string,
  role: 'advertiser' | 'creator',
): SimulatedPaymentValidation {
  if (!isSimulatedPaymentsEnabled()) {
    return { ok: false, reason: 'Simulated payments are disabled', status: 503 }
  }

  if (role !== 'advertiser') {
    return { ok: false, reason: 'Advertiser only', status: 403 }
  }

  if (deal.advertiser_id !== advertiserId) {
    return { ok: false, reason: 'Forbidden', status: 403 }
  }

  if (isDealPaymentComplete(deal)) {
    return { ok: true, alreadyPaid: true }
  }

  const status = normalizeDealStatus(deal.status)
  if (['cancelled', 'rejected', 'completed', 'disputed'].includes(status)) {
    return { ok: false, reason: 'Deal cannot be paid in current state', status: 400 }
  }

  if (deal.terms_status !== 'accepted') {
    return { ok: false, reason: 'Final terms must be accepted by both sides before payment', status: 400 }
  }

  if (!resolveDealPaymentAmount(deal)) {
    return { ok: false, reason: 'Agreed payment amount is missing', status: 400 }
  }

  const bundleLifecycle = {
    status: deal.status,
    termsStatus: deal.terms_status,
    contentMode: deal.content_mode,
    contentStatus: deal.content_status,
    placementsCount: deal.placements_count,
    placements: [],
    allPlacementsPublishedAt: deal.all_placements_published_at,
    finalReviewStartedAt: deal.final_review_started_at,
    autoCompleteDeadline: deal.auto_complete_deadline,
    termsLockedAt: deal.terms_locked_at,
  }

  if (isLegacyLifecycleDeal(bundleLifecycle)) {
    return { ok: false, reason: 'Simulated payment applies to new lifecycle deals only', status: 400 }
  }

  if (!canLockTerms(bundleLifecycle)) {
    return { ok: false, reason: 'Payment is not available for this deal', status: 400 }
  }

  if (deal.payment_status === 'paid') {
    return { ok: true, alreadyPaid: true }
  }

  return { ok: true, alreadyPaid: false }
}

export async function executeSimulatedDealPayment(dealId: string, advertiserId: string) {
  let bundle = await reloadDealBundle(dealId)
  const validation = validateSimulatedDealPayment(bundle.deal, advertiserId, 'advertiser')

  if (!validation.ok) {
    throw new DealActionError(validation.reason, validation.status)
  }

  if (validation.alreadyPaid) {
    return { bundle, alreadyPaid: true as const }
  }

  const amount = resolveDealPaymentAmount(bundle.deal)
  if (!amount) {
    throw new DealActionError('Agreed payment amount is missing', 400)
  }

  const now = new Date().toISOString()
  const paymentReference = generateSimulatedPaymentReference()

  const update = {
    payment_mode: 'simulated',
    payment_status: 'paid',
    payment_amount: amount.amount,
    payment_currency: amount.currency,
    paid_at: now,
    payment_provider: SIMULATED_PAYMENT_PROVIDER,
    payment_environment: SIMULATED_PAYMENT_ENVIRONMENT,
    payment_reference: paymentReference,
    terms_status: 'locked',
    terms_locked_at: now,
    updated_at: now,
  }

  const updated = await conditionalDealUpdate(dealId, update, (q) =>
    q.eq('terms_status', 'accepted').neq('payment_status', 'paid'),
  )

  if (!updated) {
    bundle = await reloadDealBundle(dealId)
    if (isDealPaymentComplete(bundle.deal)) {
      return { bundle, alreadyPaid: true as const }
    }
    throw new DealActionError('Deal state changed; refresh and retry', 409)
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[simulated-payment] success', {
      dealId,
      paymentReference,
      amount: amount.amount,
      currency: amount.currency,
    })
  }

  bundle = await reloadDealBundle(dealId)
  return { bundle, alreadyPaid: false as const, paymentReference }
}
