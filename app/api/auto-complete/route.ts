import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    const { data: stale, error: fetchError } = await supabase
      .from('ad_requests')
      .select('id')
      .eq('status', 'submitted')
      .lt('updated_at', cutoff)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!stale?.length) {
      return NextResponse.json({ success: true, completed: 0 })
    }

    const ids = stale.map((r) => r.id)
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('ad_requests')
      .update({
        status: 'completed',
        completed_at: now,
        auto_completed: true,
      })
      .in('id', ids)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, completed: ids.length })
  } catch (error) {
    console.error('Auto-complete error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
