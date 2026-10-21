'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import PageHeader from '@/components/ui/PageHeader'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'
import {
  AD_REQUEST_FILES_BUCKET,
  AD_REQUEST_MAX_FILES,
  formatMarketplaceOrderTotal,
  formatSnapshotLine,
  parsePreferredDates,
  quoteMarketplaceAdRequest,
  validateAdRequestFileMeta,
  type CatalogPriceItem,
  type SelectedPriceInput,
} from '@/lib/ad-request-order'
import { formatPrice } from '@/lib/currency'
import { isPriceListCurrency } from '@/lib/channel-prices'
import type { CurrencyCode } from '@/lib/database.types'

type QtyMap = Record<string, number>

export default function RequestAdPage() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get('channelId')

  const [user, setUser] = useState<any>(null)
  const [channel, setChannel] = useState<any>(null)
  const [catalog, setCatalog] = useState<CatalogPriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [advertiserName, setAdvertiserName] = useState('')
  const [message, setMessage] = useState('')
  const [quantities, setQuantities] = useState<QtyMap>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [dateDraft, setDateDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/login')
        return
      }
      setUser(authUser)

      if (!channelId) {
        setLoadError('Канал не указан')
        setLoading(false)
        return
      }

      const [{ data: profile }, { data, error }, { data: prices }] = await Promise.all([
        supabase.from('profiles').select('full_name, username').eq('id', authUser.id).single(),
        supabase.from('marketplace_channels').select('*').eq('id', channelId).single(),
        supabase
          .from('channel_prices')
          .select('id, channel_id, type, description, price, currency, sort_order')
          .eq('channel_id', channelId)
          .order('sort_order', { ascending: true }),
      ])

      const defaultName = profile?.full_name || profile?.username || authUser.email?.split('@')[0] || ''
      setAdvertiserName(defaultName)

      if (error || !data) {
        setLoadError('Канал не найден')
        setLoading(false)
        return
      }

      if (data.owner_id === authUser.id) {
        setLoadError('Нельзя отправить запрос на свой канал')
        setLoading(false)
        return
      }

      setChannel(data)
      setCatalog((prices || []) as CatalogPriceItem[])
      setLoading(false)
    }
    load()
  }, [channelId])

  const selections: SelectedPriceInput[] = selectedIds.map((id) => ({
    id,
    quantity: quantities[id] || 1,
  }))

  const quoted = useMemo(
    () =>
      quoteMarketplaceAdRequest({
        channelId: channelId || '',
        catalog,
        selections,
      }),
    [channelId, catalog, selectedIds, quantities],
  )

  const hasPriceList = catalog.length > 0
  const isCustom = !hasPriceList

  const toggleService = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
    setQuantities((current) => ({ ...current, [id]: current[id] || 1 }))
  }

  const addDate = () => {
    const parsed = parsePreferredDates([...dates, dateDraft])
    if ('error' in parsed) {
      setSubmitError(
        parsed.error === 'Preferred dates cannot be in the past'
          ? 'Нельзя выбрать прошедшую дату'
          : 'Проверьте даты размещения',
      )
      return
    }
    setSubmitError(null)
    setDates(parsed.dates)
    setDateDraft('')
  }

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    const next = [...files]
    for (const file of Array.from(list)) {
      const check = validateAdRequestFileMeta(file)
      if ('error' in check) {
        setSubmitError(
          check.error === 'File type is not allowed'
            ? 'Этот тип файла не поддерживается'
            : 'Файл слишком большой',
        )
        continue
      }
      if (next.length >= AD_REQUEST_MAX_FILES) {
        setSubmitError('Можно прикрепить не больше 10 файлов')
        break
      }
      next.push(file)
    }
    setFiles(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelId || !user) return
    setSubmitError(null)

    if (!advertiserName.trim()) {
      setSubmitError('Укажите имя рекламодателя')
      return
    }
    if (!message.trim()) {
      setSubmitError('Опишите задание')
      return
    }
    if ('error' in quoted) {
      setSubmitError(
        quoted.error === 'Select at least one service from the price list'
          ? 'Выберите хотя бы одну услугу из прайс-листа'
          : quoted.error,
      )
      return
    }

    setSubmitting(true)

    const { data: dealId, error } = await supabase.rpc('create_marketplace_ad_request', {
      p_channel_id: channelId,
      p_advertiser_name: advertiserName.trim(),
      p_message: message.trim(),
      p_items: selections.map((item) => ({ id: item.id, quantity: item.quantity })),
      p_dates: dates,
    })

    if (error || !dealId) {
      setSubmitting(false)
      setSubmitError(error?.message || 'Не удалось создать заказ')
      return
    }

    for (const file of files) {
      const prepared = await supabase.rpc('prepare_ad_request_file', {
        p_ad_request_id: dealId,
        p_original_name: file.name,
        p_mime_type: file.type,
        p_size_bytes: file.size,
      })
      if (prepared.error || !prepared.data) {
        setSubmitting(false)
        setSubmitError(prepared.error?.message || 'Не удалось подготовить файл')
        return
      }
      const path = (prepared.data as { path?: string }).path
      if (!path) {
        setSubmitting(false)
        setSubmitError('Сервер не вернул путь файла')
        return
      }
      const uploaded = await supabase.storage.from(AD_REQUEST_FILES_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploaded.error) {
        setSubmitting(false)
        setSubmitError(uploaded.error.message)
        return
      }
    }

    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_ad_request',
          channelId,
          dealId,
          advertiserName: advertiserName.trim(),
          message: message.trim(),
          budget: quoted.quote.total,
        }),
      })
    } catch {
      console.log('Notification failed silently')
    }

    router.push(`/dashboard/deal/${dealId}?created=1`)
  }

  if (!user || loading) {
    return <div className="ui-meta">Загрузка...</div>
  }

  return (
    <div className="dashboard-form-inner">
      <Link
        href={channelId ? `/dashboard/channel/${channelId}` : '/dashboard/marketplace'}
        className="ui-meta mb-8 inline-flex items-center gap-2 hover:opacity-80 transition"
      >
        ← Назад к каналу
      </Link>

      {loadError ? (
        <Surface padding="lg" className="text-center">
          <p className="ui-body">{loadError}</p>
        </Surface>
      ) : (
        <>
          <PageHeader
            title="Запросить рекламу"
            description={
              channel
                ? `Канал: ${channel.name}${channel.telegram_username ? ` · @${channel.telegram_username}` : ''}`
                : undefined
            }
          />

          <form onSubmit={(e) => void handleSubmit(e)}>
            <Surface padding="lg" className="flex flex-col gap-5">
              <label className="ui-field">
                <span className="ui-field__label">Имя рекламодателя</span>
                <input
                  required
                  value={advertiserName}
                  onChange={(e) => setAdvertiserName(e.target.value)}
                  className="ui-input"
                />
                <span className="ui-field__hint">Подставляется из профиля, можно изменить для этого заказа</span>
              </label>

              {hasPriceList ? (
                <div>
                  <h2 className="ui-section-title mb-2">Выбранные услуги</h2>
                  <p className="ui-meta" style={{ marginBottom: '12px' }}>
                    Можно выбрать одну или несколько позиций из актуального прайс-листа.
                  </p>
                  <div className="flex flex-col gap-3">
                    {catalog.map((item) => {
                      const checked = selectedIds.includes(item.id)
                      const currency = (isPriceListCurrency(item.currency) ? item.currency : 'USD') as CurrencyCode
                      return (
                        <label
                          key={item.id}
                          className="ui-surface ui-surface--pad-sm"
                          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                        >
                          <span style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(item.id)}
                            />
                            <span>
                              <span className="ui-body" style={{ display: 'block' }}>{item.type}</span>
                              {item.description ? <span className="ui-meta">{item.description}</span> : null}
                              <span className="ui-meta" style={{ display: 'block', marginTop: '4px' }}>
                                {formatPrice(Number(item.price), currency)}
                              </span>
                            </span>
                          </span>
                          {checked ? (
                            <label className="ui-field" style={{ margin: 0 }}>
                              <span className="ui-field__label">Количество</span>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={quantities[item.id] || 1}
                                onChange={(e) =>
                                  setQuantities((current) => ({
                                    ...current,
                                    [item.id]: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                                  }))
                                }
                                className="ui-input"
                              />
                            </label>
                          ) : null}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="ui-surface ui-surface--pad-sm">
                  <h2 className="ui-section-title mb-1">Прайс-лист</h2>
                  <p className="ui-body">Владелец пока не добавил прайс-лист</p>
                  <p className="ui-meta" style={{ marginTop: '8px' }}>
                    Можно отправить свободный запрос. Статус цены: <strong>Согласуется с владельцем</strong>.
                    Финальную сумму назначит владелец канала.
                  </p>
                </div>
              )}

              <label className="ui-field">
                <span className="ui-field__label">Описание задания</span>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Что нужно разместить, сроки, пожелания по тексту"
                  rows={5}
                  className="ui-input ui-textarea"
                />
              </label>

              <div>
                <h2 className="ui-section-title mb-2">Материалы</h2>
                <p className="ui-meta" style={{ marginBottom: '8px' }}>
                  PDF, изображения, видео и документы. До 10 файлов.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {files.length > 0 ? (
                  <ul className="ui-meta" style={{ marginTop: '8px' }}>
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="ui-btn ui-btn--ghost ui-btn--sm"
                          onClick={() => setFiles(files.filter((_, i) => i !== index))}
                        >
                          Убрать
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div>
                <h2 className="ui-section-title mb-2">Предпочтительные даты</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label className="ui-field" style={{ margin: 0 }}>
                    <span className="ui-field__label">Добавить дату</span>
                    <input
                      type="date"
                      value={dateDraft}
                      onChange={(e) => setDateDraft(e.target.value)}
                      className="ui-input"
                    />
                  </label>
                  <Button type="button" variant="secondary" onClick={addDate}>
                    Добавить
                  </Button>
                </div>
                {dates.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {dates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        className="ui-btn ui-btn--ghost ui-btn--sm"
                        onClick={() => setDates(dates.filter((item) => item !== date))}
                      >
                        {new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU')} ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="ui-meta" style={{ marginTop: '8px' }}>Даты не выбраны</p>
                )}
              </div>

              <div className="ui-surface ui-surface--pad-sm">
                <h2 className="ui-section-title mb-2">Итоговая сумма</h2>
                {isCustom ? (
                  <p className="ui-body">{formatMarketplaceOrderTotal({ pricing_mode: 'custom', budget: null })}</p>
                ) : 'quote' in quoted && quoted.quote.mode === 'price_list' ? (
                  <>
                    <ul className="flex flex-col gap-2" style={{ marginBottom: '10px' }}>
                      {quoted.quote.lines.map((line) => {
                        const formatted = formatSnapshotLine(line)
                        return (
                          <li key={line.channel_price_id} className="flex justify-between gap-4">
                            <span className="ui-body">{formatted.title}</span>
                            <span className="ui-body">{formatted.subtotal}</span>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="ui-card-title">
                      {formatPrice(quoted.quote.total, quoted.quote.currency)}
                    </p>
                  </>
                ) : (
                  <p className="ui-meta">Выберите услуги, чтобы увидеть итог</p>
                )}
              </div>

              {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

              <Button type="submit" disabled={submitting} fullWidth>
                {submitting ? 'Отправка...' : 'Отправить запрос'}
              </Button>
            </Surface>
          </form>
        </>
      )}
    </div>
  )
}
