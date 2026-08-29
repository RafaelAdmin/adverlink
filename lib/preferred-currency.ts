import type { CurrencyCode } from '@/lib/database.types'

export const PREFERRED_CURRENCY_KEY = 'adverlink_preferred_currency'
export const PREFERRED_CURRENCY_CHANGED = 'adverlink-preferred-currency-changed'
export const DEFAULT_PREFERRED_CURRENCY: CurrencyCode = 'USD'

const SUPPORTED: CurrencyCode[] = ['USD', 'EUR', 'AMD', 'GEL', 'RUB']

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return !!value && SUPPORTED.includes(value as CurrencyCode)
}

/** localStorage cache only — not authoritative for logged-in users. */
export function getLocalPreferredCurrency(): CurrencyCode {
  if (typeof globalThis.localStorage === 'undefined') return DEFAULT_PREFERRED_CURRENCY
  const stored = globalThis.localStorage.getItem(PREFERRED_CURRENCY_KEY)
  return isCurrencyCode(stored) ? stored : DEFAULT_PREFERRED_CURRENCY
}

export function setLocalPreferredCurrency(currency: CurrencyCode): void {
  if (typeof globalThis.localStorage === 'undefined') return
  globalThis.localStorage.setItem(PREFERRED_CURRENCY_KEY, currency)
}

export function notifyPreferredCurrencyChanged(): void {
  if (typeof globalThis.window === 'undefined') return
  globalThis.window.dispatchEvent(new Event(PREFERRED_CURRENCY_CHANGED))
}

/**
 * Resolve viewer currency with DB profile precedence for authenticated users.
 * Does not write to profile — caller persists explicitly on user selection.
 */
export function resolvePreferredCurrency(input: {
  profileCurrency?: string | null
  localCurrency?: string | null
  isAuthenticated: boolean
}): CurrencyCode {
  if (input.isAuthenticated && isCurrencyCode(input.profileCurrency)) {
    return input.profileCurrency
  }
  if (isCurrencyCode(input.localCurrency)) {
    return input.localCurrency
  }
  return DEFAULT_PREFERRED_CURRENCY
}

/** @deprecated Use getLocalPreferredCurrency or resolvePreferredCurrency */
export function getPreferredCurrency(): CurrencyCode {
  return getLocalPreferredCurrency()
}

/** @deprecated Use setLocalPreferredCurrency + profile persistence */
export function setPreferredCurrency(currency: CurrencyCode): void {
  setLocalPreferredCurrency(currency)
  notifyPreferredCurrencyChanged()
}
