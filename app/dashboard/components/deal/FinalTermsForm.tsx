'use client'

import { useState } from 'react'
import type { CurrencyCode } from '@/lib/database.types'
import { dealBtn } from '@/lib/deals'
import {
  FINAL_TERMS_CURRENCIES,
  validateFinalTermsForm,
  type FinalTermsFormValues,
} from '@/lib/final-terms-ui'

type FinalTermsFormProps = {
  initialValues: FinalTermsFormValues
  submitting?: boolean
  onCancel: () => void
  onSubmit: (values: FinalTermsFormValues) => void
}

export default function FinalTermsForm({
  initialValues,
  submitting,
  onCancel,
  onSubmit,
}: FinalTermsFormProps) {
  const [values, setValues] = useState<FinalTermsFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const validationError = validateFinalTermsForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onSubmit(values)
  }

  return (
    <div className="ui-surface ui-surface--pad-sm space-y-4">
      <div>
        <div className="text-white/50 text-xs mb-2">Тип контента</div>
        <div className="flex flex-col sm:flex-row gap-2">
          {(
            [
              ['advertiser_provides', 'Рекламодатель предоставляет контент'],
              ['creator_creates', 'Автор готовит контент'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              disabled={submitting}
              onClick={() => setValues((prev) => ({ ...prev, contentMode: mode }))}
              className={`flex-1 ui-btn ui-btn--sm text-left ${
                values.contentMode === mode ? 'ui-btn--primary' : 'ui-btn--ghost'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-white/45 text-xs mt-2">
          {values.contentMode === 'creator_creates'
            ? 'Автор готовит контент на основе брифа рекламодателя.'
            : 'Рекламодатель предоставляет готовый рекламный контент.'}
        </p>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block" htmlFor="placementsCount">
          Размещений
        </label>
        <input
          id="placementsCount"
          type="number"
          min={1}
          value={values.placementsCount}
          disabled={submitting}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, placementsCount: Number(e.target.value) || 1 }))
          }
          className="w-full sm:w-32 ui-input"
        />
      </div>

      <div>
        <div className="text-white/50 text-xs mb-2">Период</div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="date"
            value={values.placementStartAt}
            disabled={submitting}
            onChange={(e) => setValues((prev) => ({ ...prev, placementStartAt: e.target.value }))}
            className="flex-1 ui-input"
          />
          <span className="text-white/30 text-center hidden sm:block">→</span>
          <input
            type="date"
            value={values.placementEndAt}
            disabled={submitting}
            onChange={(e) => setValues((prev) => ({ ...prev, placementEndAt: e.target.value }))}
            className="flex-1 ui-input"
          />
        </div>
      </div>

      <div>
        <div className="text-white/50 text-xs mb-2">Итоговая цена</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            value={values.finalPrice}
            disabled={submitting}
            onChange={(e) => setValues((prev) => ({ ...prev, finalPrice: Number(e.target.value) || 0 }))}
            className="flex-1 ui-input"
          />
          <select
            value={values.finalPriceCurrency}
            disabled={submitting}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                finalPriceCurrency: e.target.value as CurrencyCode,
              }))
            }
            className="sm:w-28 ui-input"
          >
            {FINAL_TERMS_CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-gray-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block" htmlFor="additionalTerms">
          Дополнительные условия
        </label>
        <textarea
          id="additionalTerms"
          rows={3}
          value={values.additionalTerms}
          disabled={submitting}
          onChange={(e) => setValues((prev) => ({ ...prev, additionalTerms: e.target.value }))}
          className="w-full ui-input ui-textarea min-h-[80px]"
          placeholder="Необязательно"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className="flex-1 ui-btn ui-btn--ghost ui-btn--md"
        >
          Отмена
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          style={{ ...dealBtn.submit, opacity: submitting ? 0.6 : 1, flex: 1 }}
        >
          {submitting ? 'Отправка…' : 'Отправить предложение'}
        </button>
      </div>
    </div>
  )
}
