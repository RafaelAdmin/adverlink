import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channelId = request.nextUrl.searchParams.get('channelId')
  const fromParam = request.nextUrl.searchParams.get('from')
  const toParam = request.nextUrl.searchParams.get('to')

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }

  const { supabase, user } = session

  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin === true
  const isOwner = channel.owner_id === user.id

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 30)
  fromDate.setHours(0, 0, 0, 0)
  let toDate = new Date()
  toDate.setHours(23, 59, 59, 999)

  if (fromParam && toParam) {
    fromDate = new Date(fromParam)
    fromDate.setHours(0, 0, 0, 0)
    toDate = new Date(toParam)
    toDate.setHours(23, 59, 59, 999)
  }

  const { data: requests } = await supabase
    .from('ad_requests')
    .select('*')
    .eq('channel_id', channelId)
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())
    .order('created_at', { ascending: false })

  const token = process.env.TELEGRAM_BOT_TOKEN
  let telegramStats = null

  if (channel.platform === 'telegram' || !channel.platform) {
    try {
      const chatRes = await fetch(
        `https://api.telegram.org/bot${token}/getChat?chat_id=@${channel.telegram_username}`,
      )
      const chatData = await chatRes.json()

      const countRes = await fetch(
        `https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=@${channel.telegram_username}`,
      )
      const countData = await countRes.json()

      if (chatData.ok) {
        telegramStats = {
          title: chatData.result.title,
          description: chatData.result.description,
          subscriber_count: countData.ok ? countData.result : channel.subscriber_count,
        }
      }
    } catch (telegramError) {
      console.error('[channel-stats] Telegram API error:', telegramError)
    }
  }

  const completedRequests = (requests || []).filter((r) => r.status === 'completed')
  const totalRevenue = completedRequests.reduce((sum, r) => sum + (r.budget || 0), 0)

  const periodLabel = `${fromDate.toLocaleDateString('ru-RU')} — ${toDate.toLocaleDateString('ru-RU')}`

  return NextResponse.json({
    channel,
    telegramStats,
    requests: requests || [],
    periodLabel,
    stats: {
      totalRequests: (requests || []).length,
      completedDeals: completedRequests.length,
      pendingDeals: (requests || []).filter((r) => r.status === 'new' || r.status === 'payment_pending').length,
      totalRevenue,
      avgDealValue: completedRequests.length > 0 ? totalRevenue / completedRequests.length : 0,
    },
  })
}
