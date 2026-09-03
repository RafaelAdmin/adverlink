'use client'

import { useState } from 'react'
import { dealBtn } from '@/lib/deals'
import {
  materialToFormValues,
  validateAdvertiserContentForm,
  type ContentFormValues,
} from '@/lib/deal-content-ui'
import type { DealMaterial } from '@/lib/database.types'

type AdvertiserContentFormProps = {
  mode: 'advertiser_provides' | 'creator_creates_brief'
  material: DealMaterial | null
  readOnly?: boolean
  submitting?: boolean
  onSave?: (values: ContentFormValues) => void
}

export default function AdvertiserContentForm({
  mode,
  material,
  readOnly,
  submitting,
  onSave,
}: AdvertiserContentFormProps) {
  const [values, setValues] = useState<ContentFormValues>(materialToFormValues(material))
  const [error, setError] = useState<string | null>(null)

  const title =
    mode === 'creator_creates_brief' ? 'Бриф для автора' : 'Рекламный материал'
  const bodyLabel =
    mode === 'creator_creates_brief' ? 'Инструкции / бриф' : 'Текст рекламы'
  const saveLabel =
    mode === 'creator_creates_brief' ? 'Сохранить бриф' : 'Сохранить рекламный материал'

  const handleSave = () => {
    if (!onSave) return
    const validationError = validateAdvertiserContentForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onSave(values)
  }

  if (readOnly) {
    return (
      <div className="ui-surface ui-surface--pad-sm p-4 space-y-3">
        <div className="text-white font-medium">{title}</div>
        {material?.body_text ? (
          <>
            <div>
              <div className="text-white/50 text-xs mb-1">{bodyLabel}</div>
              <p className="text-white/85 text-sm whitespace-pre-wrap">{material.body_text}</p>
            </div>
            {material.destination_url && (
              <div>
                <div className="text-white/50 text-xs mb-1">URL назначения</div>
                <a
                  href={material.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm break-all hover:underline"
                >
                  {material.destination_url}
                </a>
              </div>
            )}
          </>
        ) : (
          <p className="text-white/50 text-sm">Материал ещё не добавлен.</p>
        )}
      </div>
    )
  }

  return (
    <div className="ui-surface ui-surface--pad-sm p-4 space-y-4">
      <div className="text-white font-medium">{title}</div>

      <div>
        <label className="text-white/50 text-xs mb-1 block" htmlFor="content-body">
          {bodyLabel}
        </label>
        <textarea
          id="content-body"
          rows={6}
          disabled={submitting}
          value={values.bodyText}
          onChange={(e) => setValues((prev) => ({ ...prev, bodyText: e.target.value }))}
          className="ui-input w-full"
          placeholder={
            mode === 'creator_creates_brief'
              ? 'Опишите, что нужно подготовить автору...'
              : 'Вставьте финальный рекламный текст...'
          }
        />
      </div>

      <div>
        <label className="text-white/50 text-xs mb-1 block" htmlFor="content-destination">
          URL назначения
        </label>
        <input
          id="content-destination"
          type="url"
          disabled={submitting}
          value={values.destinationUrl}
          onChange={(e) => setValues((prev) => ({ ...prev, destinationUrl: e.target.value }))}
          className="ui-input w-full"
          placeholder="https://example.com"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="button"
        disabled={submitting}
        onClick={handleSave}
        style={{ ...dealBtn, opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? 'Сохранение...' : saveLabel}
      </button>
    </div>
  )
}
