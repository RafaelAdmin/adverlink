'use client'

import { useState } from 'react'
import { getBotUsername } from '@/lib/telegram-bot-client'

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
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '20px',
        marginTop: '24px',
      }}
    >
      <h2 style={{ color: 'white', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
        Подключить автоматическую аналитику
        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '13px', marginLeft: '8px' }}>
          (необязательно)
        </span>
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 12px' }}>
        Эта функция <strong style={{ color: 'rgba(255,255,255,0.85)' }}>не требуется</strong> для
        верификации или работы на маркетплейсе. Она позволяет автоматически отслеживать{' '}
        <strong style={{ color: 'rgba(255,255,255,0.85)' }}>новые публикации</strong> после
        подключения. Исторические посты не импортируются.
      </p>

      {connected ? (
        <div
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#86efac',
            fontSize: '13px',
          }}
        >
          ✓ Автоматическая аналитика подключена
        </div>
      ) : (
        <>
          <ol
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '13px',
              lineHeight: 1.9,
              paddingLeft: '20px',
              margin: '0 0 12px',
            }}
          >
            <li>
              Добавьте <strong style={{ color: 'white' }}>{botUsername}</strong> в канал как{' '}
              <strong style={{ color: 'white' }}>администратора</strong>
            </li>
            <li>
              AdverLink <strong style={{ color: 'white' }}>не нужны</strong> права публиковать,
              редактировать или удалять контент — достаточно статуса администратора для получения
              уведомлений о новых постах
            </li>
            <li>Нажмите кнопку ниже</li>
          </ol>
          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>
          )}
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="btn-accent"
            style={{
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: connecting ? 'wait' : 'pointer',
              opacity: connecting ? 0.7 : 1,
            }}
          >
            {connecting ? 'Подключение...' : 'Подключить автоматическую аналитику'}
          </button>
        </>
      )}
    </div>
  )
}
