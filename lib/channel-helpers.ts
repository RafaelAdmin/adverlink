export function getChannelHandle(channel: any): string {
  const username = channel.telegram_username || ''

  if (username.includes('youtube.com') || username.includes('youtu.be')) {
    const handleMatch = username.match(/@([^/?&]+)/)
    if (handleMatch) return '@' + handleMatch[1]

    const nameMatch = username.match(/\/(?:c|user)\/([^/?&]+)/)
    if (nameMatch) return '@' + nameMatch[1]

    return channel.name || 'YouTube канал'
  }

  if (username.startsWith('@')) return username
  if (!username) return ''
  return '@' + username
}

export function getChannelLink(channel: any): string {
  const username = channel.telegram_username || ''
  const platform = channel.platform || 'telegram'

  if (platform === 'youtube' || username.includes('youtube.com') || username.includes('youtu.be')) {
    if (username.startsWith('http')) return username
    return `https://youtube.com/@${username.replace('@', '')}`
  }

  return `https://t.me/${username.replace('@', '')}`
}

export function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'youtube': return 'ti-brand-youtube'
    case 'instagram': return 'ti-brand-instagram'
    case 'tiktok': return 'ti-brand-tiktok'
    default: return 'ti-brand-telegram'
  }
}

export function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'youtube': return '#FF0000'
    case 'instagram': return '#E1306C'
    case 'tiktok': return '#010101'
    default: return '#229ED9'
  }
}

export function getPlatformLabel(platform: string): string {
  switch (platform) {
    case 'youtube': return 'YouTube'
    case 'instagram': return 'Instagram'
    case 'tiktok': return 'TikTok'
    default: return 'Telegram'
  }
}
