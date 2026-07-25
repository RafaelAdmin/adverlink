export default function ChannelAvatar({ channel }: { channel: any }) {
  if (channel.avatar_url) {
    return (
      <img src={channel.avatar_url} alt={channel.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full avatar-accent-fallback flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
      {channel.name[0]}
    </div>
  )
}
