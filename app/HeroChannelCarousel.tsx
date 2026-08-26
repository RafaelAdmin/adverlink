'use client'

type MockChannel = {
  id: string
  name: string
  handle: string
  platform: 'telegram' | 'youtube'
  description: string
  subscribers: number
  views: number
  engagement: number
  price: number
  verified: boolean
  pro: boolean
  avatarLetter: string
  avatarColor: string
}

const MOCK_CHANNELS: MockChannel[] = [
  {
    id: '1',
    name: '"Движ Париж" — про деньги',
    handle: '@dvizh_parizh',
    platform: 'telegram',
    description: 'Кушаем круассаны, ловим инвестиционный хайп, шутим над экономикой и делимся мудростью.',
    subscribers: 243,
    views: 165,
    engagement: 9,
    price: 25,
    verified: true,
    pro: true,
    avatarLetter: 'Д',
    avatarColor: '#2563eb',
  },
  {
    id: '2',
    name: 'IT-clopedia',
    handle: '@it_clopedia',
    platform: 'telegram',
    description: 'Новости IT, гаджеты, стартапы и всё про технологии в Армении и мире.',
    subscribers: 1240,
    views: 890,
    engagement: 12,
    price: 15,
    verified: true,
    pro: false,
    avatarLetter: 'I',
    avatarColor: '#7c3aed',
  },
  {
    id: '3',
    name: 'Ереванский дворик',
    handle: '@yerevan_dvorik',
    platform: 'telegram',
    description: 'Жизнь Еревана: кафе, события, аренда, работа и полезные советы для жителей.',
    subscribers: 8700,
    views: 3200,
    engagement: 7,
    price: 45,
    verified: true,
    pro: true,
    avatarLetter: 'Е',
    avatarColor: '#0d9488',
  },
  {
    id: '4',
    name: 'Рафаэл Артутюнян',
    handle: '@rafael_art',
    platform: 'youtube',
    description: 'Бизнес, маркетинг и личный бренд — практические советы для предпринимателей.',
    subscribers: 42000,
    views: 18500,
    engagement: 5,
    price: 2500,
    verified: true,
    pro: true,
    avatarLetter: 'R',
    avatarColor: '#db2777',
  },
  {
    id: '5',
    name: 'Counter-Strike 2',
    handle: '@cs2_armenia',
    platform: 'telegram',
    description: 'Новости CS2, турниры, скины и всё про киберспорт в СНГ.',
    subscribers: 5200,
    views: 2100,
    engagement: 14,
    price: 30,
    verified: true,
    pro: false,
    avatarLetter: 'C',
    avatarColor: '#ea580c',
  },
  {
    id: '6',
    name: 'Купил монеточку',
    handle: '@coin_buyer',
    platform: 'telegram',
    description: 'Крипта, NFT и инвестиции простым языком — без воды и пустых обещаний.',
    subscribers: 15600,
    views: 5400,
    engagement: 8,
    price: 120,
    verified: true,
    pro: true,
    avatarLetter: 'K',
    avatarColor: '#eab308',
  },
  {
    id: '7',
    name: 'AdverLink Official',
    handle: '@adverlink',
    platform: 'telegram',
    description: 'Официальный канал маркетплейса рекламы в социальных сетях AdverLink.',
    subscribers: 980,
    views: 420,
    engagement: 11,
    price: 0,
    verified: true,
    pro: true,
    avatarLetter: 'A',
    avatarColor: '#7c3aed',
  },
  {
    id: '8',
    name: 'обо всем',
    handle: '@obo_vsem_chnl',
    platform: 'telegram',
    description: 'Разное: новости, юмор, полезные ссылки и обсуждения на любые темы.',
    subscribers: 320,
    views: 95,
    engagement: 6,
    price: 5,
    verified: false,
    pro: false,
    avatarLetter: 'О',
    avatarColor: '#64748b',
  },
  {
    id: '9',
    name: '_SoL_carclub_',
    handle: '@solcarclub',
    platform: 'telegram',
    description: 'Авто, тюнинг, продажа машин и автосообщество Армении.',
    subscribers: 4300,
    views: 1800,
    engagement: 10,
    price: 50,
    verified: true,
    pro: false,
    avatarLetter: 'S',
    avatarColor: '#dc2626',
  },
  {
    id: '10',
    name: 'Startup Armenia',
    handle: '@startup_am',
    platform: 'telegram',
    description: 'Стартапы, инвесторы, акселераторы и истории успеха из Армении.',
    subscribers: 6800,
    views: 2400,
    engagement: 9,
    price: 75,
    verified: true,
    pro: true,
    avatarLetter: 'S',
    avatarColor: '#0891b2',
  },
]

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

function LandingChannelCard({ channel }: { channel: MockChannel }) {
  return (
    <div className="landing-channel-card">
      <div className="landing-channel-card__header">
        <div
          className="landing-channel-card__avatar"
          style={{ background: channel.avatarColor }}
        >
          {channel.avatarLetter}
        </div>
        <span className="landing-channel-card__platform">
          {channel.platform === 'youtube' ? '▶ YouTube' : '✈ Telegram'}
        </span>
        <div className="landing-channel-card__title-wrap">
          <div className="landing-channel-card__name">{channel.name}</div>
          <div className="landing-channel-card__handle">{channel.handle}</div>
        </div>
      </div>

      <p className="landing-channel-card__desc">{channel.description}</p>

      <div className="landing-channel-card__stats">
        <div>
          <strong>{formatCount(channel.subscribers)}</strong>
          <span>подписчиков</span>
        </div>
        <div>
          <strong>{formatCount(channel.views)}</strong>
          <span>охваты</span>
        </div>
        <div>
          <strong>{channel.engagement}%</strong>
          <span>вовлечённость</span>
        </div>
      </div>

      <div className="landing-channel-card__footer">
        <span className="landing-channel-card__price">
          {channel.price > 0 ? `от $${channel.price}` : 'Бесплатно'}
        </span>
        <span className="landing-channel-card__cta">Запросить рекламу</span>
      </div>
    </div>
  )
}

function CarouselColumn({
  channels,
  direction,
  centered,
}: {
  channels: MockChannel[]
  direction: 'up' | 'down'
  centered?: boolean
}) {
  const loop = [...channels, ...channels]

  return (
    <div className={`landing-carousel-column${centered ? ' landing-carousel-column--center' : ''}`}>
      <div className={`landing-carousel-track landing-carousel-track--${direction}`}>
        {loop.map((channel, index) => (
          <LandingChannelCard key={`${channel.id}-${index}`} channel={channel} />
        ))}
      </div>
    </div>
  )
}

function rotateChannels(offset: number): MockChannel[] {
  const n = MOCK_CHANNELS.length
  return Array.from({ length: n }, (_, i) => MOCK_CHANNELS[(i + offset) % n])
}

export default function HeroChannelCarousel() {
  return (
    <div className="landing-hero-carousel-wrap">
      <p className="landing-hero-carousel-label">Примеры карточек каналов</p>
      <div className="landing-hero-carousel" aria-label="Примеры карточек каналов в маркетплейсе">
        <CarouselColumn channels={rotateChannels(0)} direction="down" />
        <CarouselColumn channels={rotateChannels(3)} direction="up" centered />
        <CarouselColumn channels={rotateChannels(6)} direction="down" />
      </div>
    </div>
  )
}
