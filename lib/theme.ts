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
  return themes.find(t => t.value === saved) || themes[0]
}

export function saveTheme(role: string, themeValue: string) {
  const key = role === 'creator' ? 'adverlink_creator_theme' : 'adverlink_advertiser_theme'
  localStorage.setItem(key, themeValue)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('adverlink-theme-change'))
  }
}
