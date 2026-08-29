'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CurrencyCode } from '@/lib/database.types'
import { createClient } from '@/lib/supabase'
import {
  getLocalPreferredCurrency,
  notifyPreferredCurrencyChanged,
  PREFERRED_CURRENCY_CHANGED,
  resolvePreferredCurrency,
  setLocalPreferredCurrency,
} from '@/lib/preferred-currency'

export function usePreferredCurrency(): [
  CurrencyCode,
  (currency: CurrencyCode) => void,
  { loaded: boolean },
] {
  const supabase = createClient()
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => getLocalPreferredCurrency())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadFromProfile() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) {
          setCurrencyState(
            resolvePreferredCurrency({
              isAuthenticated: false,
              localCurrency: getLocalPreferredCurrency(),
            }),
          )
          setLoaded(true)
        }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      const resolved = resolvePreferredCurrency({
        profileCurrency: profile?.preferred_currency,
        localCurrency: getLocalPreferredCurrency(),
        isAuthenticated: true,
      })

      setCurrencyState(resolved)
      setLocalPreferredCurrency(resolved)
      setLoaded(true)
    }

    loadFromProfile()

    const syncFromEvent = () => setCurrencyState(getLocalPreferredCurrency())
    window.addEventListener(PREFERRED_CURRENCY_CHANGED, syncFromEvent)

    return () => {
      cancelled = true
      window.removeEventListener(PREFERRED_CURRENCY_CHANGED, syncFromEvent)
    }
  }, [supabase])

  const setCurrency = useCallback(
    async (code: CurrencyCode) => {
      setCurrencyState(code)
      setLocalPreferredCurrency(code)
      notifyPreferredCurrencyChanged()

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ preferred_currency: code }).eq('id', user.id)
      }
    },
    [supabase],
  )

  return [currency, setCurrency, { loaded }]
}
