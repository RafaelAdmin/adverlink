import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { codesMatch } from '@/lib/verification-check'
import { verifyTelegramChannelDescription } from '@/lib/telegram-verification'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ verified: false, reason: 'unauthorized', error: 'Unauthorized' }, { status: 401 })
  }

  let body: { channelId?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ verified: false, reason: 'invalid_body', error: 'Invalid body' }, { status: 400 })
  }

  const { channelId, code } = body
  if (!channelId || !code) {
    return NextResponse.json({ verified: false, reason: 'missing_params', error: 'Missing params' }, { status: 400 })
  }

  const { supabase, user } = session
  const { data: channel } = await supabase
    .from('channels')
    .select('id, owner_id, telegram_username, verification_code, verification_status, is_verified')
    .eq('id', channelId)
    .single()

  if (!channel || channel.owner_id !== user.id) {
    return NextResponse.json({ verified: false, reason: 'forbidden', error: 'Forbidden' }, { status: 403 })
  }

  if (channel.verification_status === 'verified' || channel.is_verified) {
    return NextResponse.json({ verified: true, reason: 'already_verified' })
  }

  if (!channel.verification_code) {
    return NextResponse.json(
      { verified: false, reason: 'code_not_issued', error: 'Verification code not issued' },
      { status: 400 },
    )
  }

  if (!codesMatch(code, channel.verification_code)) {
    return NextResponse.json({ verified: false, reason: 'code_mismatch' }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json(
      { verified: false, reason: 'telegram_unavailable', error: 'Bot token not configured' },
      { status: 500 },
    )
  }

  if (!channel.telegram_username) {
    return NextResponse.json(
      { verified: false, reason: 'invalid_username', error: 'Channel username missing' },
      { status: 400 },
    )
  }

  try {
    const result = await verifyTelegramChannelDescription({
      username: channel.telegram_username,
      submittedCode: code,
      storedCode: channel.verification_code,
      botToken: token,
    })

    if (result.verified) {
      const { error: updateError } = await supabase.rpc('verify_channel_after_check', {
        p_channel_id: channelId,
      })

      if (updateError) {
        console.error('[telegram-verify] RPC error:', updateError.message)
        return NextResponse.json(
          { verified: false, reason: 'telegram_unavailable', error: 'Verification failed' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      verified: result.verified,
      reason: result.reason,
      attempts: result.attempts,
      matchedSource: result.matchedSource,
    })
  } catch (error) {
    console.error(
      '[telegram-verify] unexpected error:',
      error instanceof Error ? error.message : error,
    )
    return NextResponse.json(
      { verified: false, reason: 'telegram_unavailable', error: 'API error' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { verified: false, error: 'Use POST with authentication' },
    { status: 405 },
  )
}
