'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AD_REQUESTS_REALTIME_TABLE,
  DEAL_REALTIME_DEBOUNCE_MS,
  MY_ORDERS_REALTIME_CHANNEL,
  adRequestIdRealtimeFilter,
  dealRowRealtimeChannelName,
  isDealRealtimeId,
} from '@/lib/deal-realtime'

/** Reloads one order when its `ad_requests` row changes. RLS still gates the event. */
export function useDealRowRealtime(
  dealId: string | null | undefined,
  enabled: boolean,
  onChange: () => void,
) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!enabled || !isDealRealtimeId(dealId)) return

    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        onChangeRef.current()
      }, DEAL_REALTIME_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(dealRowRealtimeChannelName(dealId))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: AD_REQUESTS_REALTIME_TABLE,
          filter: adRequestIdRealtimeFilter(dealId),
        },
        schedule,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [dealId, enabled])
}

/** Reloads «Мои заказы» when any visible `ad_requests` row changes (RLS-filtered). */
export function useMyOrdersRealtime(enabled: boolean, onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        onChangeRef.current()
      }, DEAL_REALTIME_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel(MY_ORDERS_REALTIME_CHANNEL)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: AD_REQUESTS_REALTIME_TABLE,
        },
        schedule,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [enabled])
}
