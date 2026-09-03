'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { generateVerificationCode } from '@/lib/verification'
import { getChannelHandle } from '@/lib/channel-helpers'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'
import AddChannelProgressStepper from '@/app/dashboard/components/AddChannelProgressStepper'

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

  if (loading || !channel) {
    return <div className="ui-meta">Загрузка...</div>
  }

  const isTelegram = channel.platform === 'telegram' || !channel.platform
  const isYoutube = channel.platform === 'youtube'
  const channelHandle = getChannelHandle(channel)
  const flowStep = verificationResult === 'success' ? 4 : 3

  return (
    <div className="dashboard-form-inner">
      <Link
        href="/dashboard"
        className="ui-meta mb-6 inline-flex items-center gap-2 hover:opacity-80 transition"
      >
        ← Мои каналы
      </Link>

      <AddChannelProgressStepper currentStep={flowStep} className="mb-6" />

      <h1 className="ui-page-title mb-2">
        {isYoutube ? 'Верификация YouTube канала' : 'Верификация канала'}
      </h1>
      <p className="ui-meta mb-8">
        {isYoutube
          ? `Подтвердите владение каналом ${channel.name}`
          : `Подтвердите владение каналом ${channelHandle}`}
      </p>

      {step === 1 && isYoutube && (
        <Surface padding="lg" className="mb-4">
          <h2 className="ui-section-title mb-5">Шаг 1: Подтвердите свой YouTube канал</h2>

          <div className="flex items-center gap-4 ui-surface ui-surface--pad-sm mb-5">
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
              <div className="ui-card-title">{channel.name}</div>
              <div className="ui-meta">{channelHandle}</div>
            </div>
          </div>

          <ol className="add-channel-instructions">
            <li>Откройте YouTube Studio (studio.youtube.com)</li>
            <li>Перейдите в раздел &quot;Настройки&quot; → &quot;Канал&quot;</li>
            <li>Подтвердите что вы владелец канала в YouTube Studio</li>
          </ol>

          <a
            href="https://studio.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ui-btn ui-btn--ghost ui-btn--sm mb-5 inline-flex"
            style={{
              borderColor: 'color-mix(in srgb, #dc2626 40%, var(--border))',
              color: '#f87171',
            }}
          >
            <i className="ti ti-brand-youtube" />
            Открыть YouTube Studio
          </a>

          <label className="ui-body flex items-center gap-2.5 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={step1Confirmed}
              onChange={(e) => setStep1Confirmed(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary, #9333ea)' }}
            />
            Я подтверждаю что являюсь владельцем этого канала
          </label>

          <Button
            type="button"
            onClick={() => setStep(2)}
            disabled={!step1Confirmed}
            fullWidth
          >
            Далее →
          </Button>
        </Surface>
      )}

      {((step === 1 && isTelegram) || (step === 2 && isYoutube)) && (
        <Surface padding="lg" className="mb-4">
          <h2 className="ui-section-title mb-5">
            {isYoutube
              ? 'Шаг 2: Добавьте код в описание YouTube канала'
              : 'Шаг 1: Добавьте код верификации в описание канала'}
          </h2>

          <div className="add-channel-verify-code">
            <p className="add-channel-verify-code__label">ВАШ КОД ВЕРИФИКАЦИИ</p>
            <p className="add-channel-verify-code__value">{verificationCode}</p>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(verificationCode)}
              className="ui-btn ui-btn--ghost ui-btn--sm mt-3"
            >
              <i className="ti ti-copy" /> Скопировать
            </button>
          </div>

          {isTelegram && (
            <div className="add-channel-info-banner add-channel-info-banner--blue">
              Поддерживаются только публичные Telegram-каналы с @username. Приватные каналы не
              поддерживаются. Верификация проверяет код в описании канала — бот-администратор не
              требуется.
            </div>
          )}

          {isTelegram ? (
            <ol className="add-channel-instructions">
              <li>Откройте ваш канал {channelHandle} в Telegram</li>
              <li>Перейдите в Настройки канала → Изменить канал</li>
              <li>
                В поле &quot;Описание&quot; добавьте код:{' '}
                <strong>{verificationCode}</strong>
              </li>
              <li>Сохраните изменения</li>
              <li>Нажмите кнопку &quot;Проверить&quot; ниже</li>
            </ol>
          ) : (
            <ol className="add-channel-instructions">
              <li>Откройте YouTube Studio (studio.youtube.com)</li>
              <li>Нажмите &quot;Настройки&quot; → &quot;Канал&quot; → &quot;Основная информация&quot;</li>
              <li>
                В поле &quot;Описание&quot; добавьте код:{' '}
                <strong>{verificationCode}</strong>
              </li>
              <li>Нажмите &quot;Сохранить&quot;</li>
              <li>Нажмите кнопку &quot;Проверить&quot; ниже</li>
            </ol>
          )}

          <div className="add-channel-info-banner add-channel-info-banner--warn mb-5">
            {isYoutube && <i className="ti ti-alert-triangle" style={{ marginRight: '6px' }} />}
            ⚠️ Код должен присутствовать в описании во время проверки. После верификации его можно удалить.
          </div>

          <div className="flex gap-3">
            {isYoutube && (
              <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">
                ← Назад
              </Button>
            )}
            <Button
              type="button"
              onClick={handleVerify}
              disabled={!verificationCode}
              className="flex-1"
            >
              {isYoutube ? 'Проверить ▶' : 'Проверить'}
            </Button>
          </div>
        </Surface>
      )}

      {((step === 2 && isTelegram) || (step === 3 && isYoutube)) && (
        <Surface padding="lg" className="mb-4">
          {verifying && (
            <div className="text-center py-10">
              <i
                className="ti ti-loader ui-meta"
                style={{
                  fontSize: '48px',
                  animation: 'spin 1s linear infinite',
                  display: 'inline-block',
                }}
              />
              <p className="ui-meta mt-4">
                {isYoutube ? 'Проверяем описание YouTube канала...' : 'Проверяем описание канала...'}
              </p>
            </div>
          )}

          {!verifying && verificationResult === 'success' && (
            <div className="text-center py-10">
              {isYoutube ? (
                <i className="ti ti-circle-check" style={{ fontSize: '64px', color: '#22c55e', marginBottom: '16px', display: 'block' }} />
              ) : (
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              )}
              <h2 className="ui-page-title mb-2">
                {isYoutube ? 'YouTube канал верифицирован!' : 'Канал верифицирован!'}
              </h2>
              <p className="ui-meta mb-4">
                {isYoutube
                  ? `${channel.name} (${channelHandle}) успешно подтверждён`
                  : `${channelHandle} успешно подтверждён`}
              </p>
              {isTelegram && (
                <p className="ui-body mb-6" style={{ lineHeight: 1.6 }}>
                  Канал готов к использованию на маркетплейсе. Автоматическую аналитику можно
                  подключить позже в настройках канала — это необязательно.
                </p>
              )}
              <Button type="button" onClick={() => router.push('/dashboard')}>
                Перейти в дашборд
              </Button>
            </div>
          )}

          {!verifying && verificationResult === 'fail' && (
            <div className="text-center py-10">
              {isYoutube ? (
                <i className="ti ti-circle-x" style={{ fontSize: '64px', color: '#f87171', marginBottom: '16px', display: 'block' }} />
              ) : (
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
              )}
              <h2 className="ui-page-title mb-2">Код не найден</h2>
              <p className="ui-meta mb-2">
                Мы не нашли код верификации в описании канала.
              </p>
              <p className="ui-body mb-6">
                Убедитесь что код точно добавлен в описание и попробуйте снова.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setStep(isYoutube ? 2 : 1)
                    setVerificationResult(null)
                  }}
                >
                  ← Назад
                </Button>
                <Button type="button" onClick={handleVerify}>
                  Попробовать снова
                </Button>
              </div>
              <p className="ui-meta mt-5 text-xs">
                Если проблема повторяется, канал будет верифицирован вручную администратором в течение 24
                часов.
              </p>
            </div>
          )}
        </Surface>
      )}
    </div>
  )
}
