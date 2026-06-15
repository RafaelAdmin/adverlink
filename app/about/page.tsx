import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-white/50 hover:text-white text-sm mb-8 inline-block">
          ← На главную
        </Link>
        <h1 className="text-3xl font-bold mb-4">О AdverLink</h1>
        <p className="text-white/60 leading-relaxed mb-6">
          AdverLink — маркетплейс рекламы в Telegram-каналах. Мы соединяем создателей контента и
          рекламодателей: каналы получают заказы, бренды — прозрачный доступ к аудитории.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 text-white/70 text-sm">
          <p>
            <strong className="text-white">Для создателей:</strong> добавьте канал, получайте заявки
            на рекламу и управляйте сделками в личном кабинете.
          </p>
          <p>
            <strong className="text-white">Для рекламодателей:</strong> найдите каналы в маркетплейсе,
            запускайте кампании и отслеживайте статус размещений.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-block mt-8 text-white rounded-full px-6 py-2.5 text-sm font-medium"
          style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
        >
          Войти в платформу
        </Link>
      </div>
    </div>
  )
}
