'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import type { Channel } from '@/lib/database.types'
import DateRangePicker from '../components/DateRangePicker'
import {
  defaultReportRange,
  filterByDateRange,
  formatPeriodLabel,
  parseReportRange,
} from '@/lib/subscriptions'

async function generateExcel(data: any) {
  const XLSX = await import('xlsx')

  const channelData = data.channel
  const stats = data.stats
  const tg = data.telegramStats
  const requests = data.requests
  const periodLabel = data.periodLabel || 'Выбранный период'

  const now = new Date()

  const overviewData = [
    ['ОТЧЁТ ПО КАНАЛУ', ''],
    ['Период', periodLabel],
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
    ['РЕКЛАМНАЯ АКТИВНОСТЬ', ''],
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

async function generatePDF(data: any) {
  const channelData = data.channel
  const stats = data.stats
  const tg = data.telegramStats
  const periodLabel = data.periodLabel || 'Выбранный период'
  const now = new Date()
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #111827; padding: 48px; line-height: 1.5; }
        .report { max-width: 860px; margin: 0 auto; }
        .header { border-bottom: 3px solid #7c3aed; padding-bottom: 24px; margin-bottom: 32px; }
        .brand-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .brand { font-size: 28px; font-weight: 800; color: #7c3aed; letter-spacing: -0.02em; }
        .brand span { color: #a78bfa; font-weight: 700; }
        .report-title { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
        .channel-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .channel-name { font-size: 22px; font-weight: 700; color: #111827; }
        .username { font-size: 14px; color: #6b7280; }
        .platform-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: ${platformBg}; color: ${platformColor}; border: 1px solid ${platformBorder}; }
        .verified-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .meta-row { display: flex; flex-wrap: wrap; gap: 20px; font-size: 13px; color: #6b7280; }
        .meta-row strong { color: #374151; }
        h2 { font-size: 15px; font-weight: 700; color: #4c1d95; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #ede9fe; text-transform: uppercase; letter-spacing: 0.06em; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
        .card { background: #f8f4ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; }
        .card-label { font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .card-value { font-size: 28px; font-weight: 800; color: #111827; line-height: 1.1; }
        .card-value.small { font-size: 22px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e9d5ff; border-radius: 12px; overflow: hidden; }
        thead th { background: #7c3aed; color: #ffffff; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        tbody td { padding: 12px 16px; border-bottom: 1px solid #f3e8ff; vertical-align: middle; }
        tbody tr:nth-child(even) { background: #faf5ff; }
        tbody tr:last-child td { border-bottom: none; }
        .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.8; }
        .footer strong { color: #7c3aed; }
        @media print { body { padding: 24px; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .report { max-width: 100%; } .card, thead th, .verified-badge, .platform-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
            ${channelData.is_verified ? '<span class="verified-badge">✓ Верифицирован</span>' : ''}
          </div>
          <div class="meta-row">
            <div>Период: <strong>${periodLabel}</strong></div>
            <div>Сгенерирован: <strong>${generatedDate}</strong></div>
          </div>
        </header>
        <h2>Статистика канала</h2>
        <div class="grid">
          <div class="card"><div class="card-label">Подписчиков</div><div class="card-value">${(tg?.subscriber_count || channelData.subscriber_count || 0).toLocaleString('ru-RU')}</div></div>
          <div class="card"><div class="card-label">Средние охваты</div><div class="card-value">${(channelData.avg_views || 0).toLocaleString('ru-RU')}</div></div>
          <div class="card"><div class="card-label">Вовлечённость</div><div class="card-value">${channelData.engagement_rate || 0}%</div></div>
          <div class="card"><div class="card-label">Цена рекламы</div><div class="card-value small">${(channelData.ad_price || 0).toLocaleString('ru-RU')} ${channelData.ad_price_currency || 'USD'}</div></div>
        </div>
        <h2>Рекламная активность</h2>
        <div class="grid">
          <div class="card"><div class="card-label">Всего запросов</div><div class="card-value">${stats.totalRequests}</div></div>
          <div class="card"><div class="card-label">Завершённых сделок</div><div class="card-value">${stats.completedDeals}</div></div>
          <div class="card"><div class="card-label">Общий доход</div><div class="card-value">$${stats.totalRevenue.toLocaleString('ru-RU')}</div></div>
          <div class="card"><div class="card-label">Средняя сделка</div><div class="card-value">$${Math.round(stats.avgDealValue).toLocaleString('ru-RU')}</div></div>
        </div>
        <h2>История сделок</h2>
        <table>
          <thead><tr><th>Дата</th><th>Рекламодатель</th><th>Бюджет</th><th>Статус</th></tr></thead>
          <tbody>${dealsRows}</tbody>
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

async function generateAdvertiserExcel(data: any) {
  const XLSX = await import('xlsx')
  const now = new Date()
  const periodLabel = data.periodLabel || 'Выбранный период'
  const stats = data.stats

  const overviewData = [
    ['ОТЧЁТ ПО РЕКЛАМНЫМ КАМПАНИЯМ', ''],
    ['Период', periodLabel],
    ['', ''],
    ['СВОДКА', ''],
    ['Всего кампаний', stats.totalCampaigns],
    ['Завершённых сделок', stats.completedDeals],
    ['Потрачено', stats.totalSpent + ' USD'],
    ['Средний охват', stats.avgReach],
    ['Стоимость просмотра', stats.costPerView],
    ['', ''],
    ['КАМПАНИИ', ''],
  ]

  const campaignHeaders = ['Название', 'Категория', 'Бюджет', 'Статус', 'Дата создания']
  const campaignRows = (data.campaigns || []).map((c: any) => [
    c.name,
    c.category || '—',
    (c.budget || 0) + ' USD',
    c.status,
    new Date(c.created_at).toLocaleDateString('ru-RU'),
  ])

  const dealHeaders = ['Дата', 'Канал', 'Бюджет', 'Охват']
  const dealRows = (data.requests || []).map((r: any) => [
    new Date(r.created_at).toLocaleDateString('ru-RU'),
    r.channel_name || '—',
    (r.budget || 0) + ' USD',
    r.reach || 0,
  ])

  const ws1 = XLSX.utils.aoa_to_sheet([...overviewData, campaignHeaders, ...campaignRows])
  const ws2 = XLSX.utils.aoa_to_sheet([dealHeaders, ...dealRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Сводка')
  XLSX.utils.book_append_sheet(wb, ws2, 'Сделки')
  XLSX.writeFile(wb, `AdverLink_campaigns_${now.getFullYear()}_${now.getMonth() + 1}.xlsx`)
}

async function generateAdvertiserPDF(data: any) {
  const now = new Date()
  const generatedDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const periodLabel = data.periodLabel || 'Выбранный период'
  const stats = data.stats

  const campaignRows =
    (data.campaigns || []).length === 0
      ? '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:24px;">Нет кампаний</td></tr>'
      : data.campaigns
          .map(
            (c: any) => `
        <tr>
          <td>${c.name}</td>
          <td>${c.category || '—'}</td>
          <td>${(c.budget || 0).toLocaleString()} USD</td>
          <td>${c.status}</td>
        </tr>`
          )
          .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="ru"><head><meta charset="utf-8"><title>AdverLink — Отчёт по кампаниям</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #111827; background: white; }
      h1 { color: #7c3aed; font-size: 24px; margin-bottom: 8px; }
      h2 { color: #4c1d95; font-size: 15px; margin: 28px 0 12px; border-bottom: 2px solid #ede9fe; padding-bottom: 6px; }
      .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .card { background: #f8f4ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 16px; }
      .card-label { font-size: 11px; color: #7c3aed; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; }
      .card-value { font-size: 24px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #7c3aed; color: white; padding: 10px 12px; text-align: left; }
      td { padding: 10px 12px; border-bottom: 1px solid #f3e8ff; }
      tr:nth-child(even) { background: #faf5ff; }
      .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <h1>AdverLink — Отчёт по рекламным кампаниям</h1>
      <div class="meta">Период: ${periodLabel} • Сгенерирован: ${generatedDate}</div>
      <h2>Сводка</h2>
      <div class="grid">
        <div class="card"><div class="card-label">Всего кампаний</div><div class="card-value">${stats.totalCampaigns}</div></div>
        <div class="card"><div class="card-label">Завершённых сделок</div><div class="card-value">${stats.completedDeals}</div></div>
        <div class="card"><div class="card-label">Потрачено</div><div class="card-value">$${stats.totalSpent.toLocaleString()}</div></div>
        <div class="card"><div class="card-label">Средний охват</div><div class="card-value">${stats.avgReach.toLocaleString()}</div></div>
      </div>
      <h2>Кампании</h2>
      <table><thead><tr><th>Название</th><th>Категория</th><th>Бюджет</th><th>Статус</th></tr></thead><tbody>${campaignRows}</tbody></table>
      <div class="footer">Отчёт создан платформой AdverLink • adverlink.vercel.app • Данные актуальны на ${generatedDate}</div>
    </body></html>
  `

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }
}

function dealStatusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    completed: { label: 'Завершена', color: '#4ade80' },
    new: { label: 'Новая', color: '#fbbf24' },
    in_progress: { label: 'В работе', color: '#60a5fa' },
    accepted: { label: 'Принята', color: '#a78bfa' },
    submitted: { label: 'На проверке', color: '#c084fc' },
    rejected: { label: 'Отклонена', color: '#f87171' },
  }
  return map[status] || { label: status, color: 'rgba(255,255,255,0.6)' }
}

const CREATOR_INCLUDES = [
  'Количество подписчиков и динамика',
  'Средние охваты постов',
  'История всех рекламных сделок',
  'Общий доход за период',
  'Средняя стоимость сделки',
]

const ADVERTISER_INCLUDES = [
  'Все активные и завершённые кампании',
  'Общие расходы на рекламу',
  'Ориентировочный охват',
  'Стоимость одного просмотра',
]

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      <div style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>{value}</div>
    </div>
  )
}

function DownloadSection({
  title,
  description,
  includes,
  generating,
  onDownload,
  dateFrom,
  dateTo,
  onDateChange,
}: {
  title: string
  description: string
  includes: string[]
  generating: boolean
  onDownload: (format: 'excel' | 'pdf') => void
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '32px',
        textAlign: 'center',
        marginTop: '24px',
      }}
    >
      <i className="ti ti-chart-dots" style={{ fontSize: '48px', color: 'var(--accent-primary, #9333ea)', display: 'block', marginBottom: '16px' }} />
      <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>{description}</p>

      <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'left' }}>
        <DateRangePicker from={dateFrom} to={dateTo} onChange={onDateChange} disabled={generating} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          margin: '24px auto',
          maxWidth: '360px',
          textAlign: 'left',
        }}
      >
        {includes.map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.15)" />
              <path d="M8 12l3 3 5-5" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onDownload('excel')}
          disabled={generating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            padding: '14px 28px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
        >
          <i className="ti ti-file-spreadsheet" style={{ fontSize: '18px' }} />
          Скачать Excel
        </button>
        <button
          type="button"
          onClick={() => onDownload('pdf')}
          disabled={generating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--accent-primary, #9333ea)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            padding: '14px 28px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
        >
          <i className="ti ti-file-type-pdf" style={{ fontSize: '18px' }} />
          Скачать PDF
        </button>
      </div>

      {generating && (
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '16px', fontSize: '13px', marginBottom: 0 }}>
          Генерация отчёта...
        </p>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { role } = useDashboard()
  const supabase = createClient()
  const defaults = defaultReportRange()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [recentDeals, setRecentDeals] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [advertiserRequests, setAdvertiserRequests] = useState<any[]>([])
  const [allCampaigns, setAllCampaigns] = useState<any[]>([])
  const [allAdvertiserRequests, setAllAdvertiserRequests] = useState<any[]>([])
  const [advertiserStats, setAdvertiserStats] = useState({
    totalCampaigns: 0,
    completedDeals: 0,
    totalSpent: 0,
    avgReach: 0,
    costPerView: '—',
  })

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || null,
    [channels, selectedChannelId],
  )

  const { from: rangeFrom, to: rangeTo } = useMemo(
    () => parseReportRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  )

  const periodLabel = useMemo(
    () => formatPeriodLabel(rangeFrom, rangeTo),
    [rangeFrom, rangeTo],
  )

  const filteredAdvertiserRequests = useMemo(
    () => filterByDateRange(allAdvertiserRequests, rangeFrom, rangeTo),
    [allAdvertiserRequests, rangeFrom, rangeTo],
  )

  const filteredCampaigns = useMemo(
    () => filterByDateRange(allCampaigns, rangeFrom, rangeTo),
    [allCampaigns, rangeFrom, rangeTo],
  )

  const computedAdvertiserStats = useMemo(() => {
    const completed = filteredAdvertiserRequests.filter((r) => r.status === 'completed')
    const totalSpent = completed.reduce((s, r) => s + (Number(r.budget) || 0), 0)
    const totalReach = completed.reduce((s, r) => s + (r.reach || 0), 0)
    const avgReach = completed.length > 0 ? Math.round(totalReach / completed.length) : 0
    const costPerView = totalReach > 0 ? `$${(totalSpent / totalReach).toFixed(4)}` : '—'
    return {
      totalCampaigns: filteredCampaigns.length,
      completedDeals: completed.length,
      totalSpent,
      avgReach,
      costPerView,
    }
  }, [filteredAdvertiserRequests, filteredCampaigns])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      if (role === 'creator') {
        const { data: ch } = await supabase
          .from('channels')
          .select('*')
          .eq('owner_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        setChannels((ch || []) as Channel[])
      } else {
        const [campaignsRes, requestsRes] = await Promise.all([
          supabase.from('campaigns').select('*').eq('advertiser_id', user.id).order('created_at', { ascending: false }),
          supabase
            .from('ad_requests')
            .select('*, channels(name, avg_views)')
            .eq('advertiser_id', user.id)
            .order('created_at', { ascending: false }),
        ])

        const camps = campaignsRes.data || []
        const requests = (requestsRes.data || []).map((r: any) => ({
          ...r,
          channel_name: r.channels?.name,
          reach: r.channels?.avg_views || 0,
        }))

        setAllCampaigns(camps)
        setAllAdvertiserRequests(requests)
        setCampaigns(camps)
        setAdvertiserRequests(requests)

        const completed = requests.filter((r) => r.status === 'completed')
        const totalSpent = completed.reduce((s, r) => s + (Number(r.budget) || 0), 0)
        const totalReach = completed.reduce((s, r) => s + (r.reach || 0), 0)
        const avgReach = completed.length > 0 ? Math.round(totalReach / completed.length) : 0
        const costPerView = totalReach > 0 ? `$${(totalSpent / totalReach).toFixed(4)}` : '—'

        setAdvertiserStats({
          totalCampaigns: camps.length,
          completedDeals: completed.length,
          totalSpent,
          avgReach,
          costPerView,
        })
      }

      setLoading(false)
    }

    load()
  }, [role])

  useEffect(() => {
    if (channels.length > 0) setSelectedChannelId(channels[0].id)
  }, [channels])

  useEffect(() => {
    setAdvertiserRequests(filteredAdvertiserRequests)
    setCampaigns(filteredCampaigns)
    setAdvertiserStats(computedAdvertiserStats)
  }, [filteredAdvertiserRequests, filteredCampaigns, computedAdvertiserStats])

  useEffect(() => {
    if (!selectedChannelId || role !== 'creator') return

    const loadDeals = async () => {
      const { data } = await supabase
        .from('ad_requests')
        .select('*')
        .eq('channel_id', selectedChannelId)
        .gte('created_at', rangeFrom.toISOString())
        .lte('created_at', rangeTo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentDeals(data || [])
    }

    loadDeals()
  }, [selectedChannelId, role, dateFrom, dateTo, rangeFrom, rangeTo])

  const handleDownload = async (format: 'excel' | 'pdf') => {
    setGenerating(true)
    try {
      if (role === 'creator') {
        if (!selectedChannelId) {
          alert('Выберите канал')
          return
        }
        const res = await fetch(
          `/api/channel-stats?channelId=${selectedChannelId}&from=${dateFrom}&to=${dateTo}`,
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed')
        if (format === 'excel') await generateExcel(data)
        else await generatePDF(data)
      } else {
        const reportData = {
          campaigns: filteredCampaigns,
          requests: filteredAdvertiserRequests,
          stats: computedAdvertiserStats,
          periodLabel,
        }
        if (format === 'excel') await generateAdvertiserExcel(reportData)
        else await generateAdvertiserPDF(reportData)
      }
    } catch {
      alert('Ошибка генерации отчёта')
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Аналитика</h1>
        <p className="text-white/50">Загрузка...</p>
      </div>
    )
  }

  if (role === 'creator') {
    if (channels.length === 0) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Аналитика</h1>
          <p className="text-white/50 mb-8">Детальные отчёты по вашим каналам</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50">
            У вас пока нет каналов для анализа
          </div>
        </div>
      )
    }

    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Аналитика</h1>
        <p className="text-white/50 mb-8">Детальные отчёты по вашим каналам</p>

        {channels.length > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
              Канал для анализа
            </label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                colorScheme: 'dark',
              }}
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedChannel && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <MetricCard
              label="Подписчиков"
              value={(selectedChannel.subscriber_count || 0).toLocaleString('ru-RU')}
            />
            <MetricCard label="Средние охваты" value={(selectedChannel.avg_views || 0).toLocaleString('ru-RU')} />
            <MetricCard label="Вовлечённость" value={`${selectedChannel.engagement_rate || 0}%`} />
            <MetricCard
              label="Цена рекламы"
              value={`${(selectedChannel.ad_price || 0).toLocaleString('ru-RU')} ${selectedChannel.ad_price_currency || 'USD'}`}
            />
          </div>
        )}

        <DownloadSection
          title="Скачать аналитический отчёт"
          description="Полная статистика канала и история сделок за выбранный период"
          includes={CREATOR_INCLUDES}
          generating={generating}
          onDownload={handleDownload}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={(from, to) => {
            setDateFrom(from)
            setDateTo(to)
          }}
        />

        <div style={{ marginTop: '32px' }}>
          <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Последние сделки</h2>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Дата', 'Рекламодатель', 'Бюджет', 'Статус'].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentDeals.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
                      За период сделок не было
                    </td>
                  </tr>
                ) : (
                  recentDeals.map((deal) => {
                    const status = dealStatusLabel(deal.status)
                    return (
                      <tr key={deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.7)' }}>
                          {new Date(deal.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'white' }}>{deal.advertiser_name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'white' }}>{(deal.budget || 0).toLocaleString()} USD</td>
                        <td style={{ padding: '12px 16px', color: status.color, fontWeight: '600' }}>{status.label}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Аналитика</h1>
      <p className="text-white/50 mb-8">Отчёты по рекламным кампаниям</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '8px' }}>
        <MetricCard label="Всего кампаний" value={advertiserStats.totalCampaigns} />
        <MetricCard label="Завершённых сделок" value={advertiserStats.completedDeals} />
        <MetricCard label="Потрачено" value={`$${advertiserStats.totalSpent.toLocaleString('ru-RU')}`} />
        <MetricCard label="Средний охват" value={advertiserStats.avgReach.toLocaleString('ru-RU')} />
      </div>

      <DownloadSection
        title="Отчёт по расходам на рекламу"
        description="История расходов, кампаний и сделок за выбранный период"
        includes={ADVERTISER_INCLUDES}
        generating={generating}
        onDownload={handleDownload}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(from, to) => {
          setDateFrom(from)
          setDateTo(to)
        }}
      />

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
          Сделки за период ({periodLabel})
        </h2>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Дата', 'Канал', 'Бюджет', 'Статус'].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAdvertiserRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
                    За выбранный период сделок не было
                  </td>
                </tr>
              ) : (
                filteredAdvertiserRequests.slice(0, 10).map((deal) => {
                  const status = dealStatusLabel(deal.status)
                  return (
                    <tr key={deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.7)' }}>
                        {new Date(deal.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'white' }}>{deal.channel_name || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'white' }}>{(deal.budget || 0).toLocaleString()} AMD</td>
                      <td style={{ padding: '12px 16px', color: status.color, fontWeight: '600' }}>{status.label}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
