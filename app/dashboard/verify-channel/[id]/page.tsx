'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { generateVerificationCode } from '@/lib/verification'
import { getChannelHandle } from '@/lib/channel-helpers'

const glassCard = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '20px',
  padding: '24px',
  marginBottom: '16px',
} as const

export default function VerifyChannelPage() {
  const params = useParams()
  const channelId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<'success' | 'fail' | null>(null)
  const [step1Confirmed, setStep1Confirmed] = useState(false)
  const [analyticsConnecting, setAnalyticsConnecting] = useState(false)
  const [analyticsConnected, setAnalyticsConnected] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('channels')
        .select('*, platform')
        .eq('id', channelId)
        .single()

      if (error || !data || data.owner_id !== user.id) {
        router.push('/dashboard')
        return
      }

      setChannel(data)
      if (data.analytics_status && data.analytics_status !== 'disconnected') {
        setAnalyticsConnected(true)
      }
      setLoading(false)
    }
    load()
  }, [channelId, router, supabase])

  useEffect(() => {
    if (!channelId) return

    const generateCode = async () => {
      const code = generateVerificationCode()
      setVerificationCode(code)

      await supabase.from('channels').update({ verification_code: code }).eq('id', channelId)
    }

    generateCode()
  }, [channelId, supabase])

  const handleVerify = async () => {
    if (!channel) return

    const youtube = channel.platform === 'youtube'

    setVerifying(true)
    setStep(isYoutube ? 3 : 2)
    setVerificationResult(null)

    try {
      const endpoint = youtube ? '/api/youtube/verify' : '/api/telegram/verify'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, code: verificationCode }),
      })
      const data = await response.json()

      if (data.verified) {
        setVerificationResult('success')
      } else {
        setVerificationResult('fail')
      }
    } catch {
      setVerificationResult('fail')
    }

    setVerifying(false)
  }

  const handleConnectAnalytics = async () => {
    if (!channel) return
    setAnalyticsConnecting(true)
    setAnalyticsError(null)
    try {
      const response = await fetch('/api/telegram/analytics/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id }),
      })
      const data = await response.json()
      if (data.connected) {
        setAnalyticsConnected(true)
      } else if (data.error === 'bot_not_admin') {
        setAnalyticsError(
          `Добавьте ${data.botUsername || '@adverlink_bot'} администратором канала, затем нажмите «Подключить аналитику» снова.`,
        )
      } else {
        setAnalyticsError(data.error || 'Не удалось подключить аналитику')
      }
    } catch {
      setAnalyticsError('Ошибка подключения')
    }
    setAnalyticsConnecting(false)
  }

  if (loading || !channel) {
    return <div className="text-white/50">Загрузка...</div>
  }

  const isTelegram = channel.platform === 'telegram' || !channel.platform
  const isYoutube = channel.platform === 'youtube'
  const channelHandle = getChannelHandle(channel)
  const stepLabels = isYoutube
    ? [
        { num: 1, label: 'Найти канал' },
        { num: 2, label: 'Добавить код' },
        { num: 3, label: 'Проверка' },
      ]
    : [
        { num: 1, label: 'Добавить код' },
        { num: 2, label: 'Проверка' },
      ]

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition text-sm mb-6 inline-flex items-center gap-2"
      >
        ← Мои каналы
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">
        {isYoutube ? 'Верификация YouTube канала' : 'Верификация канала'}
      </h1>
      <p className="text-white/50 mb-8 text-sm">
        {isYoutube
          ? `Подтвердите владение каналом ${channel.name}`
          : `Подтвердите владение каналом ${channelHandle}`}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        {stepLabels.map((s, i) => (
          <Fragment key={s.num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  background:
                    step > s.num
                      ? '#22c55e'
                      : step === s.num
                        ? 'var(--accent-primary, #9333ea)'
                        : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: step === s.num ? '2px solid rgba(255,255,255,0.3)' : 'none',
                }}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span
                style={{
                  color: step >= s.num ? 'white' : 'rgba(255,255,255,0.3)',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  background: step > s.num ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  margin: '0 8px',
                  marginBottom: '20px',
                }}
              />
            )}
          </Fragment>
        ))}
      </div>

      {step === 1 && isYoutube && (
        <div style={glassCard}>
          <h2 className="text-white font-semibold text-lg mb-5">Шаг 1: Подтвердите свой YouTube канал</h2>

          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FF0000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <i className="ti ti-brand-youtube" style={{ fontSize: '24px', color: 'white' }} />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{channel.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                {channelHandle}
              </div>
            </div>
          </div>

          <ol style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '2', marginBottom: '20px', paddingLeft: '20px' }}>
            <li>Откройте YouTube Studio (studio.youtube.com)</li>
            <li>Перейдите в раздел &quot;Настройки&quot; → &quot;Канал&quot;</li>
            <li>Подтвердите что вы владелец канала в YouTube Studio</li>
          </ol>

          <a
            href="https://studio.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(220,38,38,0.2)',
              border: '1px solid rgba(220,38,38,0.4)',
              color: '#f87171',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '20px',
            }}
          >
            <i className="ti ti-brand-youtube" />
            Открыть YouTube Studio
          </a>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
            }}
          >
            <input
              type="checkbox"
              checked={step1Confirmed}
              onChange={(e) => setStep1Confirmed(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary, #9333ea)' }}
            />
            Я подтверждаю что являюсь владельцем этого канала
          </label>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!step1Confirmed}
            style={{
              marginTop: '20px',
              backgroundColor: step1Confirmed ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.1)',
              color: step1Confirmed ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 24px',
              fontSize: '14px',
              cursor: step1Confirmed ? 'pointer' : 'not-allowed',
              width: '100%',
            }}
          >
            Далее →
          </button>
        </div>
      )}

      {((step === 1 && isTelegram) || (step === 2 && isYoutube)) && (
        <div style={glassCard}>
          <h2 className="text-white font-semibold text-lg mb-5">
            {isYoutube
              ? 'Шаг 2: Добавьте код в описание YouTube канала'
              : 'Шаг 1: Добавьте код верификации в описание канала'}
          </h2>

          <div
            style={{
              background: 'color-mix(in srgb, var(--accent-primary, #9333ea) 12%, transparent)',
              border: '2px dashed color-mix(in srgb, var(--accent-primary, #9333ea) 45%, transparent)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
              ВАШ КОД ВЕРИФИКАЦИИ
            </p>
            <p
              style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: '800',
                letterSpacing: '3px',
                fontFamily: 'monospace',
              }}
            >
              {verificationCode}
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(verificationCode)}
              style={{
                marginTop: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <i className="ti ti-copy" /> Скопировать
            </button>
          </div>

          {isTelegram && (
            <div
              style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0 }}>
                Поддерживаются только публичные Telegram-каналы с @username. Приватные каналы не
                поддерживаются. Верификация проверяет код в описании канала — бот-администратор не
                требуется.
              </p>
            </div>
          )}

          {isTelegram ? (
            <ol style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '2', marginBottom: '20px', paddingLeft: '20px' }}>
              <li>Откройте ваш канал {channelHandle} в Telegram</li>
              <li>Перейдите в Настройки канала → Изменить канал</li>
              <li>
                В поле &quot;Описание&quot; добавьте код:{' '}
                <strong style={{ color: 'white' }}>{verificationCode}</strong>
              </li>
              <li>Сохраните изменения</li>
              <li>Нажмите кнопку &quot;Проверить&quot; ниже</li>
            </ol>
          ) : (
            <ol style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '2', marginBottom: '20px', paddingLeft: '20px' }}>
              <li>Откройте YouTube Studio (studio.youtube.com)</li>
              <li>Нажмите &quot;Настройки&quot; → &quot;Канал&quot; → &quot;Основная информация&quot;</li>
              <li>
                В поле &quot;Описание&quot; добавьте код:{' '}
                <strong style={{ color: 'white' }}>{verificationCode}</strong>
              </li>
              <li>Нажмите &quot;Сохранить&quot;</li>
              <li>Нажмите кнопку &quot;Проверить&quot; ниже</li>
            </ol>
          )}

          <div
            style={{
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: '#fbbf24', fontSize: '13px', margin: 0 }}>
              {isYoutube && <i className="ti ti-alert-triangle" style={{ marginRight: '6px' }} />}
              ⚠️ Код должен присутствовать в описании во время проверки. После верификации его можно удалить.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {isYoutube && (
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  borderRadius: '14px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                ← Назад
              </button>
            )}
            <button
              type="button"
              onClick={handleVerify}
              disabled={!verificationCode}
              className="btn-accent"
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '14px',
                padding: '12px 24px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {isYoutube ? 'Проверить ▶' : 'Проверить'}
            </button>
          </div>
        </div>
      )}

      {((step === 2 && isTelegram) || (step === 3 && isYoutube)) && (
        <div style={glassCard}>
          {verifying && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i
                className="ti ti-loader"
                style={{
                  fontSize: '48px',
                  color: 'rgba(255,255,255,0.3)',
                  animation: 'spin 1s linear infinite',
                  display: 'inline-block',
                }}
              />
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '16px' }}>
                {isYoutube ? 'Проверяем описание YouTube канала...' : 'Проверяем описание канала...'}
              </p>
            </div>
          )}

          {!verifying && verificationResult === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              {isYoutube ? (
                <i className="ti ti-circle-check" style={{ fontSize: '64px', color: '#22c55e', marginBottom: '16px', display: 'block' }} />
              ) : (
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              )}
              <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                {isYoutube ? 'YouTube канал верифицирован!' : 'Канал верифицирован!'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                {isYoutube
                  ? `${channel.name} (${channelHandle}) успешно подтверждён`
                  : `${channelHandle} успешно подтверждён`}
              </p>
              {isTelegram && (
                <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                  <div
                    style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      marginBottom: '12px',
                    }}
                  >
                    <p style={{ color: '#86efac', fontSize: '13px', margin: 0, fontWeight: 600 }}>
                      ✓ Владение подтверждено
                    </p>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>
                      Шаг 2: Подключение аналитики (рекомендуется)
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6 }}>
                      Аналитика собирается только для <strong style={{ color: 'white' }}>новых постов</strong>{' '}
                      после подключения. Исторические посты не импортируются.
                    </p>
                    <ol style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.9', paddingLeft: '20px', margin: '0 0 12px' }}>
                      <li>
                        Добавьте <strong style={{ color: 'white' }}>@adverlink_bot</strong> в канал как{' '}
                        <strong style={{ color: 'white' }}>администратора</strong>
                      </li>
                      <li>
                        Специальные права (публикация, удаление и т.д.) боту не нужны — достаточно статуса
                        администратора для получения новых постов
                      </li>
                      <li>Нажмите «Подключить аналитику» ниже</li>
                    </ol>

                    {analyticsConnected ? (
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
                        ✓ Аналитика подключена — новые посты будут отслеживаться
                      </div>
                    ) : (
                      <>
                        {analyticsError && (
                          <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 12px' }}>{analyticsError}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleConnectAnalytics}
                          disabled={analyticsConnecting}
                          className="btn-accent"
                          style={{
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            cursor: analyticsConnecting ? 'wait' : 'pointer',
                            opacity: analyticsConnecting ? 0.7 : 1,
                          }}
                        >
                          {analyticsConnecting ? 'Подключение...' : 'Подключить аналитику'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn-accent"
                style={{
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 32px',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Перейти в дашборд
              </button>
            </div>
          )}

          {!verifying && verificationResult === 'fail' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              {isYoutube ? (
                <i className="ti ti-circle-x" style={{ fontSize: '64px', color: '#f87171', marginBottom: '16px', display: 'block' }} />
              ) : (
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
              )}
              <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                Код не найден
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                Мы не нашли код верификации в описании канала.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>
                Убедитесь что код точно добавлен в описание и попробуйте снова.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(isYoutube ? 2 : 1)
                    setVerificationResult(null)
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'white',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ← Назад
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  className="btn-accent"
                  style={{
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Попробовать снова
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '20px' }}>
                Если проблема повторяется, канал будет верифицирован вручную администратором в течение 24
                часов.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
