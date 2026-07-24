'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const glassCard = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '20px',
  padding: '24px',
  marginBottom: '16px',
} as const

export default function VerifyYouTubePage() {
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
  const [codeAdded, setCodeAdded] = useState(false)

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
        .select('*')
        .eq('id', channelId)
        .single()

      if (error || !data || data.owner_id !== user.id) {
        router.push('/dashboard')
        return
      }

      setChannel(data)
      setLoading(false)
    }
    load()
  }, [channelId, router, supabase])

  useEffect(() => {
    if (!channelId) return

    const generateCode = async () => {
      const code = 'ADVERLINK-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      setVerificationCode(code)

      await supabase.from('channels').update({ verification_code: code }).eq('id', channelId)
    }

    generateCode()
  }, [channelId, supabase])

  const handleVerify = async () => {
    if (!channel) return

    setVerifying(true)
    setStep(3)
    setVerificationResult(null)

    try {
      const channelHandle = channel.telegram_username
      const response = await fetch(
        `/api/youtube/verify?channel=${encodeURIComponent(channelHandle)}&code=${verificationCode}`
      )
      const data = await response.json()

      if (data.verified) {
        await supabase
          .from('channels')
          .update({
            verification_status: 'verified',
            is_verified: true,
          })
          .eq('id', channel.id)

        setVerificationResult('success')
      } else {
        setVerificationResult('fail')
      }
    } catch {
      setVerificationResult('fail')
    }

    setVerifying(false)
  }

  if (loading || !channel) {
    return <div className="text-white/50">Загрузка...</div>
  }

  const channelHandle = channel.telegram_username?.replace(/^@/, '') || ''

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition text-sm mb-6 inline-flex items-center gap-2"
      >
        ← Мои каналы
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Верификация YouTube канала</h1>
      <p className="text-white/50 mb-8 text-sm">Подтвердите владение каналом</p>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        {[
          { num: 1, label: 'Найти канал' },
          { num: 2, label: 'Добавить код' },
          { num: 3, label: 'Проверка' },
        ].map((s, i) => (
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
            {i < 2 && (
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

      {step === 1 && (
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
                @{channelHandle}
              </div>
            </div>
          </div>

          <ol style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '2', marginBottom: '20px', paddingLeft: '20px' }}>
            <li>Откройте YouTube Studio (studio.youtube.com)</li>
            <li>Перейдите в раздел &quot;Настройки&quot; → &quot;Канал&quot;</li>
            <li>Убедитесь что вы владелец этого канала</li>
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
              checked={codeAdded}
              onChange={(e) => setCodeAdded(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary, #9333ea)' }}
            />
            Я подтверждаю что являюсь владельцем этого канала
          </label>

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!codeAdded}
            style={{
              marginTop: '20px',
              backgroundColor: codeAdded ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.1)',
              color: codeAdded ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 24px',
              fontSize: '14px',
              cursor: codeAdded ? 'pointer' : 'not-allowed',
              width: '100%',
            }}
          >
            Далее →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={glassCard}>
          <h2 className="text-white font-semibold text-lg mb-5">
            Шаг 2: Добавьте код в описание канала
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
              <i className="ti ti-alert-triangle" style={{ marginRight: '6px' }} />
              Код должен присутствовать в описании во время проверки. После верификации его можно удалить.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
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
              Проверить ▶
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
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
                Проверяем описание YouTube канала...
              </p>
            </div>
          )}

          {!verifying && verificationResult === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="ti ti-circle-check" style={{ fontSize: '64px', color: '#22c55e', marginBottom: '16px', display: 'block' }} />
              <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                YouTube канал верифицирован!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                {channel.name} (@{channelHandle}) успешно подтверждён
              </p>
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
              <i className="ti ti-circle-x" style={{ fontSize: '64px', color: '#f87171', marginBottom: '16px', display: 'block' }} />
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
                    setStep(2)
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
