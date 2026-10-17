import { NextResponse } from 'next/server'
import { isProPlan } from '@/lib/subscriptions'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function canExportDetailedReport(
  plan: string | null | undefined,
  isAdmin?: boolean,
) {
  return isProPlan(plan, isAdmin)
}

export async function requireProReportAccess(session: {
  supabase: SupabaseClient
  user: User
}): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: profile } = await session.supabase
    .from('profiles')
    .select('subscription_plan, is_admin')
    .eq('id', session.user.id)
    .single()

  if (!canExportDetailedReport(profile?.subscription_plan, profile?.is_admin === true)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Subscription required' },
        { status: 403 },
      ),
    }
  }

  return { ok: true }
}
