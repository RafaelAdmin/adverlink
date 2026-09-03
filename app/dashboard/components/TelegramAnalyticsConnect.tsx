'use client'

import { useState } from 'react'
import { getBotUsername } from '@/lib/telegram-bot-client'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'

type Props = {
  channelId: string
  analyticsStatus?: string | null
  isVerified: boolean
  platform?: string | null
  onConnected?: () => void
}

export default function TelegramAnalyticsConnect({
  channelId,
  analyticsStatus,
  isVerified,
  platform,
  onConnected,
}: Props) {
  const isTelegram = platform === 'telegram' || !platform
  const botUsername = `@${getBotUsername()}`
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(
    analyticsStatus === 'connected' ||
      analyticsStatus === 'collecting' ||
      analyticsStatus === 'active',
  )

  if (!isTelegram || !isVerified) return null

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const response = await fetch('/api/telegram/analytics/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
      const data = await response.json()
      if (data.connected) {
        setConnected(true)
        onConnected?.()
      } else if (data.error === 'bot_not_admin') {
        setError(
          `Добавьте ${data.botUsername || botUsername} администратором канала (без права публиковать или удалять посты), затем попробуйте снова.`,
        )
      } else {
        setError(data.error || 'Не удалось подключить аналитику')
      }
    } catch {
      setError('Ошибка подключения')
    }
    setConnecting(false)
  }

  return (
    <Surface padding="md" className="mt-6">
      <h2 className="ui-section-title mb-2">
        Подключить автоматическую аналитику
        <span className="ui-meta font-normal ml-2">(необязательно)</span>
      </h2>
      <p className="ui-body mb-3" style={{ lineHeight: 1.6 }}>
        Эта функция <strong>не требуется</strong> для
        верификации или работы на маркетплейсе. Она позволяет автоматически отслеживать{' '}
        <strong>новые публикации</strong> после
        подключения. Исторические посты не импортируются.
      </p>

      {connected ? (
        <div
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#86efac',
            fontSize: '13px',
          }}
        >
          ✓ Автоматическая аналитика подключена
        </div>
      ) : (
        <>
          <ol className="ui-body mb-3" style={{ lineHeight: 1.9, paddingLeft: '20px' }}>
            <li>
              Добавьте <strong>{botUsername}</strong> в канал как{' '}
              <strong>администратора</strong>
            </li>
            <li>
              AdverLink <strong>не нужны</strong> права публиковать,
              редактировать или удалять контент — достаточно статуса администратора для получения
              уведомлений о новых постах
            </li>
            <li>Нажмите кнопку ниже</li>
          </ol>
          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}
          <Button type="button" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Подключение...' : 'Подключить автоматическую аналитику'}
          </Button>
        </>
      )}
    </Surface>
  )
}
