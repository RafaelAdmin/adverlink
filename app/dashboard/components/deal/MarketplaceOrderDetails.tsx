'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AD_REQUEST_FILES_BUCKET,
  formatMarketplaceOrderTotal,
  formatSnapshotLine,
} from '@/lib/ad-request-order'
import { isPriceListCurrency } from '@/lib/channel-prices'
import { glassDealCard } from '@/lib/deals'
import type { AdRequest } from '@/lib/database.types'

type SnapshotRow = {
  channel_price_id: string | null
  type: string
  description: string | null
  unit_price: number
  currency: string
  quantity: number
  subtotal: number
  sort_order: number
}

type FileRow = {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
}

export default function MarketplaceOrderDetails({ request }: { request: AdRequest }) {
  const supabase = createClient()
  const [lines, setLines] = useState<SnapshotRow[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [files, setFiles] = useState<FileRow[]>([])

  useEffect(() => {
    const load = async () => {
      const [{ data: snapshotRows }, { data: dateRows }, { data: fileRows }] = await Promise.all([
        supabase
          .from('ad_request_price_snapshots')
          .select('channel_price_id, type, description, unit_price, currency, quantity, subtotal, sort_order')
          .eq('ad_request_id', request.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('ad_request_preferred_dates')
          .select('preferred_on')
          .eq('ad_request_id', request.id)
          .order('preferred_on', { ascending: true }),
        supabase
          .from('ad_request_files')
          .select('id, original_name, mime_type, size_bytes, storage_path')
          .eq('ad_request_id', request.id)
          .order('created_at', { ascending: true }),
      ])
      setLines((snapshotRows || []) as SnapshotRow[])
      setDates((dateRows || []).map((row) => row.preferred_on))
      setFiles((fileRows || []) as FileRow[])
    }
    void load()
  }, [request.id, supabase])

  const openFile = async (file: FileRow) => {
    const { data, error } = await supabase.storage
      .from(AD_REQUEST_FILES_BUCKET)
      .createSignedUrl(file.storage_path, 60)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (!request.pricing_mode && lines.length === 0 && dates.length === 0 && files.length === 0) {
    return null
  }

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <h2 className="text-white font-semibold mb-4">Запрос из маркетплейса</h2>

      <div className="mb-4">
        <div className="text-white/50 text-sm mb-1">Итоговая сумма</div>
        <div className="text-price-accent">{formatMarketplaceOrderTotal(request)}</div>
      </div>

      <div className="mb-4">
        <div className="text-white/50 text-sm mb-2">Выбранные услуги</div>
        {lines.length === 0 ? (
          <p className="text-white/70 text-sm">
            {request.pricing_mode === 'custom'
              ? 'Свободный запрос без прайс-листа. Финальная цена будет согласована владельцем канала.'
              : 'Услуги не зафиксированы'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line, index) => {
              const formatted = formatSnapshotLine({
                type: line.type,
                quantity: line.quantity,
                unit_price: Number(line.unit_price),
                subtotal: Number(line.subtotal),
                currency: isPriceListCurrency(line.currency) ? line.currency : 'USD',
              })
              return (
                <div key={`${line.channel_price_id}-${index}`}>
                  <div className="flex justify-between gap-4 text-sm text-white">
                    <span>{formatted.title}</span>
                    <span>{formatted.subtotal}</span>
                  </div>
                  {line.description ? <div className="text-white/50 text-xs">{line.description}</div> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-white/50 text-sm mb-2">Предпочтительные даты</div>
        {dates.length === 0 ? (
          <p className="text-white/70 text-sm">Не указаны</p>
        ) : (
          <p className="text-white text-sm">
            {dates.map((date) => new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU')).join(', ')}
          </p>
        )}
      </div>

      {files.length > 0 ? (
        <div>
          <div className="text-white/50 text-sm mb-2">Файлы заказа</div>
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                className="text-left text-sky-400 text-sm hover:underline"
                onClick={() => void openFile(file)}
              >
                {file.original_name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
