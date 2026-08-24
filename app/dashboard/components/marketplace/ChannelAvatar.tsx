'use client'

export default function ChannelAvatar({ channel }: { channel: { name: string; avatar_url?: string | null } }) {
  const letter = channel.name?.[0] ?? '?'

  if (!channel.avatar_url) {
    return (
      <div className="w-12 h-12 rounded-full avatar-accent-fallback flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
        {letter}
      </div>
    )
  }

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <img
        src={channel.avatar_url}
        alt={channel.name}
        className="w-12 h-12 rounded-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      <div
        className="absolute inset-0 rounded-full avatar-accent-fallback items-center justify-center text-white font-bold text-lg"
        style={{ display: 'none' }}
      >
        {letter}
      </div>
    </div>
  )
}
