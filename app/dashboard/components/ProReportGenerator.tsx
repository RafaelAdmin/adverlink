'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Channel } from '@/lib/database.types'

interface ProReportGeneratorProps {
  channel: Channel
  isPro: boolean
}

export default function ProReportGenerator({ channel, isPro }: ProReportGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel')
  const supabase = createClient()

  const generateReport = async () => {
    if (!isPro) return
    setGenerating(true)

    try {
      const res = await fetch(`/api/channel-stats?channelId=${channel.id}`)
      const data = await res.json()

      if (format === 'excel') {
        await generateExcel(data)
      } else {
        await generatePDF(data)
      }
    } catch (err) {
      console.error('Report generation failed:', err)
      alert('Ошибка при генерации отчёта')
    }

    setGenerating(false)
  }

  const generateExcel = async (data: any) => {
    const XLSX = await import('xlsx')

    const channelData = data.channel
    const stats = data.stats
    const tg = data.telegramStats
    const requests = data.requests

    const now = new Date()
    const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })

    const overviewData = [
      ['ОТЧЁТ ПО КАНАЛУ', ''],
      ['Период', monthName],
      ['', ''],
      ['ИНФОРМАЦИЯ О КАНАЛЕ', ''],
      ['Название', channelData.name],
      ['Username', '@' + channelData.telegram_username],
      ['Платформа', channelData.platform || 'Telegram'],
      ['Страна', channelData.country || '—'],
      ['Язык', channelData.language || '—'],
      ['', ''],
      ['СТАТИСТИКА', ''],
      ['Подписчиков', tg?.subscriber_count || channelData.subscriber_count || 0],
      ['Средние охваты', channelData.avg_views || 0],
      ['Вовлечённость (ER)', (channelData.engagement_rate || 0) + '%'],
      ['Цена рекламы', (channelData.ad_price || 0) + ' ' + (channelData.ad_price_currency || 'USD')],
      ['Статус верификации', channelData.is_verified ? 'Верифицирован ✓' : 'На проверке'],
      ['', ''],
      ['РЕКЛАМНАЯ АКТИВНОСТЬ (30 дней)', ''],
      ['Всего запросов', stats.totalRequests],
      ['Завершённых сделок', stats.completedDeals],
      ['Ожидают ответа', stats.pendingDeals],
      ['Общий доход', stats.totalRevenue + ' USD'],
      ['Средняя сделка', stats.avgDealValue.toFixed(2) + ' USD'],
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(overviewData)
    ws1['!cols'] = [{ wch: 30 }, { wch: 30 }]

    const dealsHeaders = ['Дата', 'Рекламодатель', 'Контакт', 'Бюджет', 'Статус', 'Сообщение']
    const dealsRows = (requests || []).map((r: any) => [
      new Date(r.created_at).toLocaleDateString('ru-RU'),
      r.advertiser_name || '—',
      r.advertiser_contact || '—',
      (r.budget || 0) + ' USD',
      r.status === 'completed'
        ? 'Завершена'
        : r.status === 'new'
          ? 'Новая'
          : r.status === 'accepted'
            ? 'Принята'
            : r.status === 'in_progress'
              ? 'В работе'
              : r.status === 'submitted'
                ? 'На проверке'
                : r.status === 'rejected'
                  ? 'Отклонена'
                  : r.status,
      r.message || '—',
    ])

    const ws2 = XLSX.utils.aoa_to_sheet([dealsHeaders, ...dealsRows])
    ws2['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 40 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Обзор канала')
    XLSX.utils.book_append_sheet(wb, ws2, 'История сделок')

    const filename = `AdverLink_${channelData.telegram_username}_${now.getFullYear()}_${now.getMonth() + 1}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const generatePDF = async (data: any) => {
    const channelData = data.channel
    const stats = data.stats
    const tg = data.telegramStats
    const now = new Date()
    const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Отчёт — ${channelData.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { color: #7c3aed; font-size: 24px; margin-bottom: 4px; }
          h2 { color: #4c1d95; font-size: 16px; margin-top: 28px; margin-bottom: 12px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          .card { background: #f8f4ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; }
          .card-label { font-size: 12px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .card-value { font-size: 22px; font-weight: 700; color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #7c3aed; color: white; padding: 8px 12px; text-align: left; }
          td { padding: 8px 12px; border-bottom: 1px solid #e9d5ff; }
          tr:nth-child(even) { background: #faf5ff; }
          .footer { margin-top: 40px; color: #999; font-size: 12px; text-align: center; }
          .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>AdverLink — Аналитический отчёт</h1>
        <div class="meta">
          Канал: <strong>${channelData.name}</strong> &nbsp;|&nbsp; 
          Период: <strong>${monthName}</strong> &nbsp;|&nbsp;
          Сгенерирован: ${now.toLocaleDateString('ru-RU')}
          ${channelData.is_verified ? ' &nbsp;|&nbsp; <span class="badge">✓ Верифицирован</span>' : ''}
        </div>

        <h2>Статистика канала</h2>
        <div class="grid">
          <div class="card">
            <div class="card-label">Подписчиков</div>
            <div class="card-value">${(tg?.subscriber_count || channelData.subscriber_count || 0).toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="card-label">Средние охваты</div>
            <div class="card-value">${(channelData.avg_views || 0).toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="card-label">Вовлечённость (ER)</div>
            <div class="card-value">${channelData.engagement_rate || 0}%</div>
          </div>
          <div class="card">
            <div class="card-label">Цена рекламы</div>
            <div class="card-value">${channelData.ad_price || 0} ${channelData.ad_price_currency || 'USD'}</div>
          </div>
        </div>

        <h2>Рекламная активность (последние 30 дней)</h2>
        <div class="grid">
          <div class="card">
            <div class="card-label">Всего запросов</div>
            <div class="card-value">${stats.totalRequests}</div>
          </div>
          <div class="card">
            <div class="card-label">Завершённых сделок</div>
            <div class="card-value">${stats.completedDeals}</div>
          </div>
          <div class="card">
            <div class="card-label">Общий доход</div>
            <div class="card-value">$${stats.totalRevenue.toFixed(0)}</div>
          </div>
          <div class="card">
            <div class="card-label">Средняя сделка</div>
            <div class="card-value">$${stats.avgDealValue.toFixed(0)}</div>
          </div>
        </div>

        <h2>История сделок</h2>
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Рекламодатель</th>
              <th>Бюджет</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.requests.length === 0
                ? '<tr><td colspan="4" style="text-align:center;color:#999;">Нет сделок за период</td></tr>'
                : data.requests
                    .map(
                      (r: any) => `
              <tr>
                <td>${new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                <td>${r.advertiser_name || '—'}</td>
                <td>${r.budget || 0} USD</td>
                <td>${
                  r.status === 'completed'
                    ? '✅ Завершена'
                    : r.status === 'new'
                      ? '🆕 Новая'
                      : r.status === 'accepted'
                        ? '✓ Принята'
                        : r.status === 'in_progress'
                          ? '🔄 В работе'
                          : r.status === 'submitted'
                            ? '👀 На проверке'
                            : r.status === 'rejected'
                              ? '✗ Отклонена'
                              : r.status
                }</td>
              </tr>
            `
                    )
                    .join('')
            }
          </tbody>
        </table>

        <div class="footer">
          Отчёт создан платформой AdverLink • adverlink.vercel.app • Pro подписка
        </div>
      </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  if (!isPro) {
    return (
      <div
        style={{
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.2)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <p style={{ color: '#fbbf24', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>
            🔒 Аналитический отчёт
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>
            Доступно в Pro подписке
          </p>
        </div>
        <button
          onClick={() => (window.location.href = '/dashboard/subscriptions')}
          style={{
            background: 'rgba(234,179,8,0.2)',
            border: '1px solid rgba(234,179,8,0.4)',
            color: '#fbbf24',
            borderRadius: '10px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Получить Pro →
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              margin: '0 0 2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: '#fbbf24' }}>★</span>
            Аналитический отчёт Pro
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>
            Статистика канала и история сделок за 30 дней
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {(['excel', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  background: format === f ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.05)',
                  color: format === f ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'excel' ? '📊 Excel' : '📄 PDF'}
              </button>
            ))}
          </div>

          <button
            onClick={generateReport}
            disabled={generating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent-primary, #9333ea)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="ti ti-download" style={{ fontSize: '15px' }} />
            {generating ? 'Генерация...' : 'Скачать отчёт'}
          </button>
        </div>
      </div>
    </div>
  )
}
