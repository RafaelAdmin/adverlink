import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, channelId, advertiserName, advertiserContact, message, budget } = body

    if (!type || !channelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: channel } = await supabase
      .from('channels')
      .select('name, telegram_username, owner_id')
      .eq('id', channelId)
      .single()

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', channel.owner_id)
      .single()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(channel.owner_id)

    const ownerEmail = userData?.user?.email
    const ownerName = ownerProfile?.full_name || 'Владелец канала'

    if (!ownerEmail) {
      return NextResponse.json({ error: 'Owner email not found' }, { status: 404 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (!RESEND_API_KEY) {
      console.log('Email notification skipped - no Resend API key')
      return NextResponse.json({ success: true, skipped: true })
    }

    const emailContent = getEmailContent(type, {
      ownerName,
      channelName: channel.name,
      channelUsername: channel.telegram_username,
      advertiserName,
      advertiserContact,
      message,
      budget,
    })

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AdverLink <notifications@adverlink.am>',
        to: ownerEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notify error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getEmailContent(type: string, data: Record<string, unknown>) {
  const baseStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #f8f9fa; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: white; 
      border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0f0c29, #1a1560); 
      padding: 32px; text-align: center; }
    .logo { color: white; font-size: 24px; font-weight: 800; margin: 0; }
    .logo span { color: #a78bfa; }
    .body { padding: 32px; }
    .title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
    .subtitle { color: #6b7280; font-size: 14px; margin: 0 0 24px; }
    .card { background: #f8f5ff; border: 1px solid #e9d5ff; 
      border-radius: 12px; padding: 20px; margin: 16px 0; }
    .card-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
    .card-label { color: #7c3aed; font-size: 12px; font-weight: 600; 
      text-transform: uppercase; min-width: 100px; padding-top: 1px; }
    .card-value { color: #1a1a2e; font-size: 14px; flex: 1; }
    .btn { display: inline-block; background: #7c3aed; color: white; 
      padding: 14px 28px; border-radius: 10px; text-decoration: none; 
      font-weight: 600; font-size: 15px; margin: 8px 0; }
    .footer { padding: 24px 32px; border-top: 1px solid #f3f4f6; 
      text-align: center; color: #9ca3af; font-size: 12px; }
  `

  if (type === 'new_ad_request') {
    return {
      subject: `💬 Новый запрос на рекламу — ${data.channelName}`,
      html: `
        <!DOCTYPE html><html><head><style>${baseStyle}</style></head>
        <body><div class="container">
          <div class="header">
            <p class="logo">Adver<span>Link</span></p>
          </div>
          <div class="body">
            <h2 class="title">Новый запрос на рекламу!</h2>
            <p class="subtitle">Кто-то хочет разместить рекламу в вашем канале</p>
            
            <div class="card">
              <div class="card-row">
                <span class="card-label">Канал</span>
                <span class="card-value"><strong>${data.channelName}</strong> (@${data.channelUsername})</span>
              </div>
              <div class="card-row">
                <span class="card-label">Рекламодатель</span>
                <span class="card-value">${data.advertiserName || '—'}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Контакт</span>
                <span class="card-value">${data.advertiserContact || '—'}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Бюджет</span>
                <span class="card-value"><strong>$${data.budget || '—'}</strong></span>
              </div>
              <div class="card-row">
                <span class="card-label">Сообщение</span>
                <span class="card-value">${data.message || '—'}</span>
              </div>
            </div>

            <p style="text-align:center; margin-top: 24px;">
              <a href="https://adverlink.vercel.app/dashboard" class="btn">
                Открыть дашборд →
              </a>
            </p>
          </div>
          <div class="footer">
            AdverLink • adverlink.vercel.app<br>
            Вы получили это письмо потому что являетесь владельцем верифицированного канала
          </div>
        </div></body></html>
      `,
    }
  }

  if (type === 'deal_completed') {
    return {
      subject: `✅ Сделка завершена — ${data.channelName}`,
      html: `
        <!DOCTYPE html><html><head><style>${baseStyle}</style></head>
        <body><div class="container">
          <div class="header">
            <p class="logo">Adver<span>Link</span></p>
          </div>
          <div class="body">
            <h2 class="title">Сделка успешно завершена!</h2>
            <p class="subtitle">Рекламодатель подтвердил выполнение заказа</p>
            
            <div class="card">
              <div class="card-row">
                <span class="card-label">Канал</span>
                <span class="card-value"><strong>${data.channelName}</strong></span>
              </div>
              <div class="card-row">
                <span class="card-label">Рекламодатель</span>
                <span class="card-value">${data.advertiserName || '—'}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Сумма</span>
                <span class="card-value" style="color:#059669;font-weight:700;">
                  $${data.budget || '—'}
                </span>
              </div>
            </div>

            <p style="text-align:center; margin-top: 24px;">
              <a href="https://adverlink.vercel.app/dashboard" class="btn">
                Открыть дашборд →
              </a>
            </p>
          </div>
          <div class="footer">
            AdverLink • adverlink.vercel.app
          </div>
        </div></body></html>
      `,
    }
  }

  if (type === 'deal_accepted') {
    return {
      subject: `✓ Ваш запрос принят — ${data.channelName}`,
      html: `
        <!DOCTYPE html><html><head><style>${baseStyle}</style></head>
        <body><div class="container">
          <div class="header">
            <p class="logo">Adver<span>Link</span></p>
          </div>
          <div class="body">
            <h2 class="title">Запрос принят!</h2>
            <p class="subtitle">Владелец канала принял ваш запрос на рекламу</p>
            
            <div class="card">
              <div class="card-row">
                <span class="card-label">Канал</span>
                <span class="card-value"><strong>${data.channelName}</strong> (@${data.channelUsername})</span>
              </div>
              <div class="card-row">
                <span class="card-label">Бюджет</span>
                <span class="card-value"><strong>$${data.budget || '—'}</strong></span>
              </div>
            </div>

            <p style="text-align:center; margin-top: 24px;">
              <a href="https://adverlink.vercel.app/dashboard" class="btn">
                Открыть дашборд →
              </a>
            </p>
          </div>
          <div class="footer">
            AdverLink • adverlink.vercel.app
          </div>
        </div></body></html>
      `,
    }
  }

  if (type === 'application_rejected') {
    return {
      subject: `Отклик отклонён — ${data.channelName}`,
      html: `
        <!DOCTYPE html><html><head><style>${baseStyle}</style></head>
        <body><div class="container">
          <div class="header">
            <p class="logo">Adver<span>Link</span></p>
          </div>
          <div class="body">
            <h2 class="title">Отклик не принят</h2>
            <p class="subtitle">Рекламодатель отклонил ваш отклик на кампанию</p>
            
            <div class="card">
              <div class="card-row">
                <span class="card-label">Кампания</span>
                <span class="card-value">${data.advertiserName || '—'}</span>
              </div>
              <div class="card-row">
                <span class="card-label">Канал</span>
                <span class="card-value"><strong>${data.channelName}</strong></span>
              </div>
              <div class="card-row">
                <span class="card-label">Бюджет</span>
                <span class="card-value">$${data.budget || '—'}</span>
              </div>
            </div>

            <p style="text-align:center; margin-top: 24px;">
              <a href="https://adverlink.vercel.app/dashboard/marketplace" class="btn">
                Смотреть другие кампании →
              </a>
            </p>
          </div>
          <div class="footer">
            AdverLink • adverlink.vercel.app
          </div>
        </div></body></html>
      `,
    }
  }

  return {
    subject: 'Уведомление от AdverLink',
    html: '<p>У вас новое уведомление на AdverLink</p>',
  }
}
