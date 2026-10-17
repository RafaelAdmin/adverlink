'use client'

import CurrencySelector from '@/app/dashboard/components/CurrencySelector'
import Button from '@/components/ui/Button'
import {
  createEmptyPriceDraft,
  formatPriceListLine,
  moveDraftPrice,
  withPriceListCurrency,
  type DraftChannelPrice,
} from '@/lib/channel-prices'
import type { CurrencyCode } from '@/lib/currency'

export default function ChannelPriceListEditor({
  items,
  onChange,
  defaultCurrency = 'USD',
  compactHint = true,
}: {
  items: DraftChannelPrice[]
  onChange: (items: DraftChannelPrice[]) => void
  defaultCurrency?: CurrencyCode
  compactHint?: boolean
}) {
  const listCurrency = items[0]?.currency || defaultCurrency

  const updateItem = (index: number, patch: Partial<DraftChannelPrice>) => {
    if (patch.currency) {
      onChange(
        withPriceListCurrency(
          items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
          patch.currency,
        ),
      )
      return
    }
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="ui-section-title mb-1">Прайс-лист</h2>
        {compactHint && (
          <p className="ui-meta" style={{ margin: 0 }}>
            Необязательно. Можно пропустить и заполнить позже в настройках канала.
          </p>
        )}
        <p className="ui-meta" style={{ margin: '8px 0 0' }}>
          Например: {formatPriceListLine({ type: 'Пост 24 часа в ленте', price: 25, currency: 'USD' })}
          {' · '}
          {formatPriceListLine({ type: 'Сторис 24 часа', price: 10, currency: 'USD' })}
        </p>
      </div>

      {items.length === 0 && (
        <p className="ui-meta">Услуг пока нет. Канал можно добавить и без прайса.</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div
            key={item.clientId}
            className="ui-surface ui-surface--pad-sm"
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <label className="ui-field" style={{ margin: 0 }}>
              <span className="ui-field__label">Название услуги</span>
              <input
                value={item.type}
                onChange={(e) => updateItem(index, { type: e.target.value })}
                placeholder="Пост 24 часа в ленте"
                className="ui-input"
              />
            </label>

            <label className="ui-field" style={{ margin: 0 }}>
              <span className="ui-field__label">Описание (необязательно)</span>
              <input
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder="Коротко, что входит в услугу"
                className="ui-input"
              />
            </label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label className="ui-field" style={{ margin: 0, flex: '1 1 140px' }}>
                <span className="ui-field__label">Цена</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.price}
                  onChange={(e) => updateItem(index, { price: e.target.value })}
                  placeholder="25"
                  className="ui-input"
                />
              </label>
              <div>
                <span className="ui-field__label" style={{ display: 'block', marginBottom: '6px' }}>
                  Валюта
                </span>
                <CurrencySelector
                  value={item.currency || listCurrency}
                  onChange={(currency) => updateItem(index, { currency })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => onChange(moveDraftPrice(items, index, -1))}
              >
                Выше
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === items.length - 1}
                onClick={() => onChange(moveDraftPrice(items, index, 1))}
              >
                Ниже
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...items, createEmptyPriceDraft(listCurrency)])}
      >
        + Добавить услугу
      </Button>
    </div>
  )
}
