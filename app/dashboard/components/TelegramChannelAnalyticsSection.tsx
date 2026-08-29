'use client'

import type { ChannelAnalyticsFields, MoneyDisplayContext } from '@/lib/telegram-analytics-display'
import { buildTelegramChannelAnalytics } from '@/lib/telegram-analytics-display'

type Props = {
  channel: ChannelAnalyticsFields & {
    ad_price?: number | null
    ad_price_currency?: string | null
    analytics_last_sync_at?: string | null
  }
  display: MoneyDisplayContext
}

function MetricTooltip({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        marginLeft: '6px',
        color: 'rgba(255,255,255,0.35)',
        cursor: 'help',
        fontSize: '12px',
        verticalAlign: 'middle',
      }}
      aria-label={text}
    >
      <i className="ti ti-info-circle" />
    </span>
  )
}

export default function TelegramChannelAnalyticsSection({ channel, display }: Props) {
  const { sections, sampleSizeWarning } = buildTelegramChannelAnalytics(channel, display)

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '16px',
      }}
    >
      <h2 style={{ color: 'white', fontWeight: '600', fontSize: '16px', margin: '0 0 8px' }}>
        Аналитика Telegram
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.5 }}>
        Публичные метрики на основе просмотров из открытого превью Telegram. Денежные значения
        показаны в вашей предпочитаемой валюте. Данные 24ч собираются примерно через сутки после
        публикации поста.
      </p>

      {sampleSizeWarning && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          {sampleSizeWarning}
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        {sections.map((section) => (
          <div key={section.title}>
            <h3
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '13px',
                fontWeight: '600',
                margin: '0 0 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {section.title}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px',
              }}
            >
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <div
                    style={{
                      color: row.value === '—' ? 'rgba(255,255,255,0.45)' : 'white',
                      fontSize: '18px',
                      fontWeight: '700',
                      marginBottom: '4px',
                      lineHeight: 1.2,
                    }}
                  >
                    {row.value}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.4 }}>
                    {row.label}
                    {row.tooltip ? <MetricTooltip text={row.tooltip} /> : null}
                  </div>
                  {row.hint ? (
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '11px',
                        marginTop: '6px',
                        lineHeight: 1.4,
                      }}
                    >
                      {row.hint}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
