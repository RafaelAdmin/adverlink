import type { AdRequest } from '@/lib/database.types'
import { isLegacyLifecycleDeal, type DealLifecycleContext } from '@/lib/deal-lifecycle'

export type PaymentMode = 'simulated' | 'real'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export const SIMULATED_PAYMENT_PROVIDER = 'simulated'
export const SIMULATED_PAYMENT_ENVIRONMENT = 'beta'

/** Server-side gate for simulated deal payments. */
export function isSimulatedPaymentsEnabled(): boolean {
  return process.env.SIMULATED_PAYMENTS_ENABLED === 'true'
}

/** Client UI gate — must mirror server flag in deployment. */
export function isSimulatedPaymentsEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_SIMULATED_PAYMENTS_ENABLED === 'true'
}

export function isSimulatedDealPayment(
  deal: Pick<AdRequest, 'payment_mode' | 'payment_status'>,
): boolean {
  return deal.payment_mode === 'simulated' && deal.payment_status === 'paid'
}

/** Real provider revenue only — simulated and legacy offline deals are excluded. */
export function countsAsRealRevenue(
  deal: Pick<AdRequest, 'payment_mode' | 'payment_status'>,
): boolean {
  return deal.payment_mode === 'real' && deal.payment_status === 'paid'
}

export type ResolvedDealPaymentAmount = {
  amount: number
  currency: string
  placementsCount: number
}

export function resolveDealPaymentAmount(
  deal: Pick<AdRequest, 'final_price' | 'placements_count'> & {
    final_price_currency: string | null
  },
): ResolvedDealPaymentAmount | null {
  if (deal.final_price == null || deal.final_price < 0) return null
  if (!deal.final_price_currency) return null
  return {
    amount: deal.final_price,
    currency: deal.final_price_currency,
    placementsCount: deal.placements_count ?? 1,
  }
}

export function isDealPaymentComplete(
  deal: Pick<AdRequest, 'payment_status' | 'terms_status' | 'terms_locked_at'>,
): boolean {
  return deal.payment_status === 'paid' && deal.terms_status === 'locked' && Boolean(deal.terms_locked_at)
}

export function isDealAwaitingSimulatedPayment(
  deal: AdRequest,
  ctx: DealLifecycleContext,
): boolean {
  if (isLegacyLifecycleDeal(ctx)) return false
  if (deal.terms_status !== 'accepted') return false
  if (isDealPaymentComplete(deal)) return false
  return true
}

export function generateSimulatedPaymentReference(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const suffix = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `SIM-${suffix}`
}

export function sumRealRevenue<T extends Pick<AdRequest, 'payment_mode' | 'payment_status' | 'budget' | 'final_price'>>(
  deals: T[],
  pickAmount: (deal: T) => number = (deal) => Number(deal.final_price ?? deal.budget) || 0,
): number {
  return deals
    .filter(countsAsRealRevenue)
    .reduce((sum, deal) => sum + pickAmount(deal), 0)
}
