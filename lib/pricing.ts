/** Canonical subscription pricing for AdverLink beta (EUR). */
export const PRICING = {
  free: {
    priceEur: 0,
    periodLabel: '/месяц',
  },
  pro: {
    priceEur: 18,
    priceYearEur: 144,
    yearDiscountLabel: 'скидка 33%',
    periodLabel: '/месяц',
  },
  business: {
    priceEur: 80,
    periodLabel: '/месяц',
  },
  avatarFrameEur: 1.99,
  /** Planned platform commission on Free plan deals when Safe Deal launches */
  freeDealCommissionPercent: 10,
} as const

export const PRO_PRICE_EUR = PRICING.pro.priceEur

export const PAYMENTS_BETA_MESSAGE =
  'Онлайн-оплата через AdverLink будет доступна позже. На этапе Beta стороны согласовывают оплату самостоятельно.'

export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true'
