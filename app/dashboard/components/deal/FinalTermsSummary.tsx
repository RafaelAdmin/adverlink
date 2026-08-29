'use client'

import { formatAmdWithUsd } from '@/lib/currency'
import type { CurrencyCode } from '@/lib/database.types'
import {
  extractAdditionalTermsNotes,
  getContentModeLabel,
  getContentModeShort,
  normalizeContentMode,
  type DealTermsFields,
} from '@/lib/final-terms-ui'

type FinalTermsSummaryProps = {
  deal: Partial<DealTermsFields>
  compact?: boolean
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return '—'
  const fmt = (v: string) => new Date(v).toLocaleDateString('ru-RU')
  if (start && end) return `${fmt(start)} — ${fmt(end)}`
  if (start) return `с ${fmt(start)}`
  return `до ${fmt(end!)}`
}

function formatPrice(price: number | null | undefined, currency: CurrencyCode | string | null | undefined): string {
  if (price == null) return '—'
  if (currency === 'AMD') return formatAmdWithUsd(price)
  return `${price.toLocaleString('ru-RU')} ${currency || ''}`.trim()
}

export default function FinalTermsSummary({ deal, compact }: FinalTermsSummaryProps) {
  const notes = extractAdditionalTermsNotes(deal.final_terms)

  return (
    <div className={compact ? 'space-y-2 text-sm' : 'space-y-3 text-sm'}>
      <div>
        <div className="text-white/50 text-xs mb-1">Тип контента</div>
        <div className="text-white">{getContentModeShort(normalizeContentMode(deal.content_mode))}</div>
        {!compact && (
          <div className="text-white/60 text-xs mt-1">{getContentModeLabel(deal.content_mode)}</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-white/50 text-xs mb-1">Размещений</div>
          <div className="text-white">{deal.placements_count ?? '—'}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs mb-1">Период</div>
          <div className="text-white">{formatPeriod(deal.placement_start_at, deal.placement_end_at)}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs mb-1">Итоговая цена</div>
          <div className="text-price-accent">{formatPrice(deal.final_price, deal.final_price_currency)}</div>
        </div>
      </div>

      {notes && (
        <div>
          <div className="text-white/50 text-xs mb-1">Дополнительные условия</div>
          <p className="text-white/80 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  )
}
