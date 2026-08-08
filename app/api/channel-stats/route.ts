import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get('channelId')
  const fromParam = request.nextUrl.searchParams.get('from')
  const toParam = request.nextUrl.searchParams.get('to')

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
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
    } catch {
      // Use stored data if Telegram API fails
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
