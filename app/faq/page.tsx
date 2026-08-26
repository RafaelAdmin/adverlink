import Link from 'next/link'

const faqs = [
  {
    q: 'Сколько стоят тарифы?',
    a: 'Free — €0/мес (до 3 каналов и 3 кампаний в месяц). Pro — €18/мес, Business — €80/мес. Оплата подписок пока недоступна (Beta, «Скоро»).',
  },
  {
    q: 'Как добавить канал?',
    a: 'Зарегистрируйтесь, переключитесь в режим создателя и нажмите «Добавить канал». Укажите @username Telegram-канала — данные подтянутся автоматически.',
  },
  {
    q: 'Как заказать рекламу?',
    a: 'В режиме рекламодателя откройте маркетплейс, выберите канал и нажмите «Запросить рекламу». Владелец канала увидит заявку в разделе заказов.',
  },
  {
    q: 'Как работают отзывы?',
    a: 'После завершения сделки (статус «Завершён») можно оставить отзыв. Они отображаются в разделе «Отзывы» — «Обо мне» и «Мои отзывы».',
  },
  {
    q: 'В какой валюте указан бюджет?',
    a: 'Бюджеты кампаний и заявок указываются в армянских драмах (AMD). Подписки Free/Pro/Business — в евро (EUR). Примерный эквивалент USD для бюджетов показан справочно.',
  },
  {
    q: 'Как связаться с поддержкой?',
    a: 'Напишите нам через раздел «Настройки» в личном кабинете или на email, указанный на сайте.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-white/50 hover:text-white text-sm mb-8 inline-block">
          ← На главную
        </Link>
        <h1 className="text-3xl font-bold mb-2">Частые вопросы</h1>
        <p className="text-white/50 mb-8 text-sm">Ответы на популярные вопросы об AdverLink</p>
        <div className="flex flex-col gap-4">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-white font-semibold mb-2">{item.q}</h2>
              <p className="text-white/60 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard"
          className="inline-block mt-8 text-white/50 hover:text-white text-sm"
        >
          Перейти в личный кабинет →
        </Link>
      </div>
    </div>
  )
}
