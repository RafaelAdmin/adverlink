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
    const generatedDate = now.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const platform = channelData.platform || 'telegram'
    const platformLabel = platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : platform === 'tiktok' ? 'TikTok' : 'Telegram'
    const platformBg = platform === 'youtube' ? '#fef2f2' : '#eff6ff'
    const platformColor = platform === 'youtube' ? '#dc2626' : '#2563eb'
    const platformBorder = platform === 'youtube' ? '#fecaca' : '#bfdbfe'

    const formatStatus = (status: string) => {
      const map: Record<string, { label: string; bg: string; color: string }> = {
        completed: { label: 'Завершена', bg: '#dcfce7', color: '#15803d' },
        new: { label: 'Новая', bg: '#fef9c3', color: '#a16207' },
        in_progress: { label: 'В работе', bg: '#dbeafe', color: '#1d4ed8' },
        accepted: { label: 'Принята', bg: '#ede9fe', color: '#6d28d9' },
        submitted: { label: 'На проверке', bg: '#f3e8ff', color: '#7e22ce' },
        rejected: { label: 'Отклонена', bg: '#fee2e2', color: '#b91c1c' },
      }
      const item = map[status] || { label: status, bg: '#f3f4f6', color: '#374151' }
      return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${item.bg};color:${item.color};">${item.label}</span>`
    }

    const dealsRows =
      data.requests.length === 0
        ? `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:24px;font-size:14px;">За период сделок не было</td></tr>`
        : data.requests
            .map(
              (r: any) => `
          <tr>
            <td>${new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
            <td>${r.advertiser_name || '—'}</td>
            <td style="font-weight:600;">${(r.budget || 0).toLocaleString()} USD</td>
            <td>${formatStatus(r.status)}</td>
          </tr>
        `
            )
            .join('')

    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>AdverLink — Отчёт — ${channelData.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            color: #111827;
            padding: 48px;
            line-height: 1.5;
          }
          .report { max-width: 860px; margin: 0 auto; }
          .header {
            border-bottom: 3px solid #7c3aed;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .brand-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 20px;
          }
          .brand {
            font-size: 28px;
            font-weight: 800;
            color: #7c3aed;
            letter-spacing: -0.02em;
          }
          .brand span { color: #a78bfa; font-weight: 700; }
          .report-title {
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .channel-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 12px;
          }
          .channel-name {
            font-size: 22px;
            font-weight: 700;
            color: #111827;
          }
          .username {
            font-size: 14px;
            color: #6b7280;
          }
          .platform-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 999px;
            background: ${platformBg};
            color: ${platformColor};
            border: 1px solid ${platformBorder};
          }
          .verified-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 999px;
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .meta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 13px;
            color: #6b7280;
          }
          .meta-row strong { color: #374151; }
          h2 {
            font-size: 15px;
            font-weight: 700;
            color: #4c1d95;
            margin: 32px 0 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ede9fe;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 8px;
          }
          .card {
            background: #f8f4ff;
            border: 1px solid #e9d5ff;
            border-radius: 12px;
            padding: 20px;
          }
          .card-label {
            font-size: 11px;
            font-weight: 700;
            color: #7c3aed;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          }
          .card-value {
            font-size: 28px;
            font-weight: 800;
            color: #111827;
            line-height: 1.1;
          }
          .card-value.small {
            font-size: 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            border: 1px solid #e9d5ff;
            border-radius: 12px;
            overflow: hidden;
          }
          thead th {
            background: #7c3aed;
            color: #ffffff;
            padding: 12px 16px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          tbody td {
            padding: 12px 16px;
            border-bottom: 1px solid #f3e8ff;
            vertical-align: middle;
          }
          tbody tr:nth-child(even) { background: #faf5ff; }
          tbody tr:last-child td { border-bottom: none; }
          .footer {
            margin-top: 48px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            line-height: 1.8;
          }
          .footer strong { color: #7c3aed; }
          @media print {
            body { padding: 24px; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report { max-width: 100%; }
            .card, thead th, .verified-badge, .platform-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <header class="header">
            <div class="brand-row">
              <div class="brand">Adver<span>Link</span></div>
              <div class="report-title">Аналитический отчёт</div>
            </div>
            <div class="channel-row">
              <div class="channel-name">${channelData.name}</div>
              <div class="username">@${channelData.telegram_username || '—'}</div>
              <span class="platform-badge">${platformLabel}</span>
              ${
                channelData.is_verified
                  ? '<span class="verified-badge">✓ Верифицирован</span>'
                  : ''
              }
            </div>
            <div class="meta-row">
              <div>Период: <strong>последние 30 дней (${monthName})</strong></div>
              <div>Сгенерирован: <strong>${generatedDate}</strong></div>
            </div>
          </header>

          <h2>Статистика канала</h2>
          <div class="grid">
            <div class="card">
              <div class="card-label">Подписчиков</div>
              <div class="card-value">${(tg?.subscriber_count || channelData.subscriber_count || 0).toLocaleString('ru-RU')}</div>
            </div>
            <div class="card">
              <div class="card-label">Средние охваты</div>
              <div class="card-value">${(channelData.avg_views || 0).toLocaleString('ru-RU')}</div>
            </div>
            <div class="card">
              <div class="card-label">Вовлечённость</div>
              <div class="card-value">${channelData.engagement_rate || 0}%</div>
            </div>
            <div class="card">
              <div class="card-label">Цена рекламы</div>
              <div class="card-value small">${(channelData.ad_price || 0).toLocaleString('ru-RU')} ${channelData.ad_price_currency || 'USD'}</div>
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
              <div class="card-value">$${stats.totalRevenue.toLocaleString('ru-RU')}</div>
            </div>
            <div class="card">
              <div class="card-label">Средняя сделка</div>
              <div class="card-value">$${Math.round(stats.avgDealValue).toLocaleString('ru-RU')}</div>
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
              ${dealsRows}
            </tbody>
          </table>

          <footer class="footer">
            <div>Отчёт создан платформой <strong>AdverLink</strong> • adverlink.vercel.app</div>
            <div>Данные актуальны на <strong>${generatedDate}</strong></div>
          </footer>
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
