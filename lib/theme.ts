export const accentColors = [
  {
    name: 'Фиолетовый',
    value: 'purple',
    primary: '#9333ea',
    hover: '#a855f7',
    bg: 'rgba(147,51,234,0.15)',
    border: 'rgba(147,51,234,0.5)',
    gradient: 'from-[#0f0c29] via-[#1a1560] to-[#24243e]',
    gradientRaw: 'linear-gradient(135deg, #0f0c29 0%, #1a1560 50%, #24243e 100%)',
  },
  {
    name: 'Синий',
    value: 'blue',
    primary: '#2563eb',
    hover: '#3b82f6',
    bg: 'rgba(37,99,235,0.15)',
    border: 'rgba(37,99,235,0.5)',
    gradient: 'from-[#040d1f] via-[#0a1f4e] to-[#0f2d6b]',
    gradientRaw: 'linear-gradient(135deg, #040d1f 0%, #0a1f4e 50%, #0f2d6b 100%)',
  },
  {
    name: 'Красный',
    value: 'red',
    primary: '#dc2626',
    hover: '#ef4444',
    bg: 'rgba(220,38,38,0.15)',
    border: 'rgba(220,38,38,0.5)',
    gradient: 'from-[#1f0505] via-[#3b0a0a] to-[#4a0f0f]',
    gradientRaw: 'linear-gradient(135deg, #1f0505 0%, #3b0a0a 50%, #4a0f0f 100%)',
  },
  {
    name: 'Оранжевый',
    value: 'orange',
    primary: '#ea580c',
    hover: '#f97316',
    bg: 'rgba(234,88,12,0.15)',
    border: 'rgba(234,88,12,0.5)',
    gradient: 'from-[#1f0e05] via-[#3b1a05] to-[#4a230a]',
    gradientRaw: 'linear-gradient(135deg, #1f0e05 0%, #3b1a05 50%, #4a230a 100%)',
  },
  {
    name: 'Жёлтый',
    value: 'yellow',
    primary: '#ca8a04',
    hover: '#eab308',
    bg: 'rgba(202,138,4,0.15)',
    border: 'rgba(202,138,4,0.5)',
    gradient: 'from-[#1a1400] via-[#2d2200] to-[#3d2e00]',
    gradientRaw: 'linear-gradient(135deg, #1a1400 0%, #2d2200 50%, #3d2e00 100%)',
  },
  {
    name: 'Голубой',
    value: 'teal',
    primary: '#0d9488',
    hover: '#14b8a6',
    bg: 'rgba(13,148,136,0.15)',
    border: 'rgba(13,148,136,0.5)',
    gradient: 'from-[#021a18] via-[#05302c] to-[#093d38]',
    gradientRaw: 'linear-gradient(135deg, #021a18 0%, #05302c 50%, #093d38 100%)',
  },
  {
    name: 'Розовый',
    value: 'pink',
    primary: '#db2777',
    hover: '#ec4899',
    bg: 'rgba(219,39,119,0.15)',
    border: 'rgba(219,39,119,0.5)',
    gradient: 'from-[#1f0514] via-[#3b0a24] to-[#4a0f2e]',
    gradientRaw: 'linear-gradient(135deg, #1f0514 0%, #3b0a24 50%, #4a0f2e 100%)',
  },
  {
    name: 'Белый',
    value: 'white',
    primary: '#94a3b8',
    hover: '#cbd5e1',
    bg: 'rgba(255,255,255,0.1)',
    border: 'rgba(255,255,255,0.3)',
    gradient: 'from-[#0a0a0f] via-[#111118] to-[#1a1a24]',
    gradientRaw: 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #1a1a24 100%)',
  },
]

export const defaultColors = {
  creator: 'pink',
  advertiser: 'blue',
}

export function getAccentColor(role: string): (typeof accentColors)[0] {
  const key = role === 'creator' ? 'adverlink_creator_accent' : 'adverlink_advertiser_accent'
  const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null
  const colorValue = saved || defaultColors[role as keyof typeof defaultColors] || 'purple'
  return accentColors.find((c) => c.value === colorValue) || accentColors[0]
}

export function saveAccentColor(role: string, colorValue: string) {
  const key = role === 'creator' ? 'adverlink_creator_accent' : 'adverlink_advertiser_accent'
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, colorValue)
  }
}

export function applyAccentColor(color: (typeof accentColors)[0]) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--accent-primary', color.primary)
  root.style.setProperty('--accent-hover', color.hover)
  root.style.setProperty('--accent-bg', color.bg)
  root.style.setProperty('--accent-border', color.border)
  root.style.setProperty('--layout-gradient', color.gradientRaw)
}

export const creatorThemes = [
  { name: 'Фиолетовый', value: 'creator-purple', gradient: 'from-[#0f0c29] via-[#1a1560] to-[#24243e]', accent: '#9333ea' },
  { name: 'Зелёный', value: 'creator-green', gradient: 'from-[#0a1f0a] via-[#0d3b1a] to-[#1a4a2e]', accent: '#16a34a' },
  { name: 'Синий', value: 'creator-blue', gradient: 'from-[#0a0f1f] via-[#0d1b3b] to-[#1a2a4a]', accent: '#2563eb' },
  { name: 'Красный', value: 'creator-red', gradient: 'from-[#1f0a0a] via-[#3b0d0d] to-[#4a1a1a]', accent: '#dc2626' },
  { name: 'Тёмный', value: 'creator-dark', gradient: 'from-[#0a0a0a] via-[#141414] to-[#1f1f1f]', accent: '#6b7280' },
]

export const advertiserThemes = [
  { name: 'Фиолетовый', value: 'advertiser-purple', gradient: 'from-[#0f0c29] via-[#1a1560] to-[#24243e]', accent: '#9333ea' },
  { name: 'Оранжевый', value: 'advertiser-orange', gradient: 'from-[#1f0f0a] via-[#3b1f0d] to-[#4a2a1a]', accent: '#ea580c' },
  { name: 'Розовый', value: 'advertiser-pink', gradient: 'from-[#1f0a1a] via-[#3b0d2e] to-[#4a1a3a]', accent: '#db2777' },
  { name: 'Голубой', value: 'advertiser-teal', gradient: 'from-[#0a1f1f] via-[#0d3b3b] to-[#1a4a4a]', accent: '#0d9488' },
  { name: 'Тёмный', value: 'advertiser-dark', gradient: 'from-[#0a0a0a] via-[#141414] to-[#1f1f1f]', accent: '#6b7280' },
]

export function getTheme(role: string) {
  const key = role === 'creator' ? 'adverlink_creator_theme' : 'adverlink_advertiser_theme'
  const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null
  const themes = role === 'creator' ? creatorThemes : advertiserThemes
  return themes.find((t) => t.value === saved) || themes[0]
}

export function saveTheme(role: string, themeValue: string) {
  const key = role === 'creator' ? 'adverlink_creator_theme' : 'adverlink_advertiser_theme'
  localStorage.setItem(key, themeValue)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('adverlink-theme-change'))
  }
}
