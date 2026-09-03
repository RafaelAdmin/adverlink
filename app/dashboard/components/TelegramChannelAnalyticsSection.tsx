'use client'

import type { ChannelAnalyticsFields, MoneyDisplayContext } from '@/lib/telegram-analytics-display'
import { buildTelegramChannelAnalytics } from '@/lib/telegram-analytics-display'
import Surface from '@/components/ui/Surface'

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
      className="ui-meta"
      style={{ marginLeft: '6px', cursor: 'help', fontSize: '12px', verticalAlign: 'middle' }}
      aria-label={text}
    >
      <i className="ti ti-info-circle" />
    </span>
  )
}

export default function TelegramChannelAnalyticsSection({ channel, display }: Props) {
  const { sections, sampleSizeWarning } = buildTelegramChannelAnalytics(channel, display)

  return (
    <Surface padding="md" style={{ marginBottom: '12px' }}>
      <h2 className="ui-section-title mb-2">Аналитика Telegram</h2>
      <p className="ui-meta mb-4" style={{ lineHeight: 1.5 }}>
        Публичные метрики на основе просмотров из открытого превью Telegram. Денежные значения
        показаны в вашей предпочитаемой валюте. Данные 24ч собираются примерно через сутки после
        публикации поста.
      </p>

      {sampleSizeWarning && (
        <div className="ui-surface ui-surface--pad-sm ui-meta mb-4" style={{ lineHeight: 1.5 }}>
          {sampleSizeWarning}
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="ui-meta" style={{ fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {section.title}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px',
              }}
            >
              {section.rows.map((row) => (
                <div key={row.label} className="dashboard-stat-card" style={{ padding: '12px' }}>
                  <div
                    className={`dashboard-stat-card__value ${row.value === '—' ? 'ui-meta' : ''}`}
                    style={{ fontSize: '1.125rem' }}
                  >
                    {row.value}
                  </div>
                  <div className="dashboard-stat-card__label" style={{ marginBottom: 0 }}>
                    {row.label}
                    {row.tooltip ? <MetricTooltip text={row.tooltip} /> : null}
                  </div>
                  {row.hint ? (
                    <div className="ui-meta" style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.4 }}>
                      {row.hint}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  )
}
