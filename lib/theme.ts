export type SpaceRole = 'creator' | 'advertiser'
export type SpaceThemeMode = 'dark' | 'light'

export type AccentColor = {
  name: string
  value: string
  primary: string
  hover: string
  bg: string
  border: string
  gradient: string
  gradientRaw: string
  lightGradientRaw: string
}

export const accentColors: AccentColor[] = [
  {
    name: 'Фиолетовый',
    value: 'purple',
    primary: '#7c3aed',
    hover: '#8b5cf6',
    bg: 'rgba(124,58,237,0.12)',
    border: 'rgba(124,58,237,0.35)',
    gradient: 'from-[#0f0c29] via-[#1a1560] to-[#24243e]',
    gradientRaw: 'linear-gradient(135deg, #0a0818 0%, #141038 45%, #1a1848 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 42%, #e4e0fb 100%)',
  },
  {
    name: 'Синий',
    value: 'blue',
    primary: '#2563eb',
    hover: '#3b82f6',
    bg: 'rgba(37,99,235,0.12)',
    border: 'rgba(37,99,235,0.35)',
    gradient: 'from-[#040d1f] via-[#0a1f4e] to-[#0f2d6b]',
    gradientRaw: 'linear-gradient(135deg, #040812 0%, #0a1838 45%, #0f2248 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #f0f7ff 0%, #e8f1fe 42%, #dceafe 100%)',
  },
  {
    name: 'Красный',
    value: 'red',
    primary: '#dc2626',
    hover: '#ef4444',
    bg: 'rgba(220,38,38,0.12)',
    border: 'rgba(220,38,38,0.35)',
    gradient: 'from-[#1f0505] via-[#3b0a0a] to-[#4a0f0f]',
    gradientRaw: 'linear-gradient(135deg, #120606 0%, #280909 45%, #360d0d 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #fff5f5 0%, #feecec 42%, #fde2e2 100%)',
  },
  {
    name: 'Оранжевый',
    value: 'orange',
    primary: '#ea580c',
    hover: '#f97316',
    bg: 'rgba(234,88,12,0.12)',
    border: 'rgba(234,88,12,0.35)',
    gradient: 'from-[#1f0e05] via-[#3b1a05] to-[#4a230a]',
    gradientRaw: 'linear-gradient(135deg, #140a04 0%, #2a1506 45%, #381c08 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #fff8f3 0%, #ffefe3 42%, #ffe6d4 100%)',
  },
  {
    name: 'Жёлтый',
    value: 'yellow',
    primary: '#ca8a04',
    hover: '#eab308',
    bg: 'rgba(202,138,4,0.14)',
    border: 'rgba(202,138,4,0.38)',
    gradient: 'from-[#1a1400] via-[#2d2200] to-[#3d2e00]',
    gradientRaw: 'linear-gradient(135deg, #121000 0%, #241c00 45%, #322800 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 42%, #fde68a 100%)',
  },
  {
    name: 'Голубой',
    value: 'teal',
    primary: '#0d9488',
    hover: '#14b8a6',
    bg: 'rgba(13,148,136,0.12)',
    border: 'rgba(13,148,136,0.35)',
    gradient: 'from-[#021a18] via-[#05302c] to-[#093d38]',
    gradientRaw: 'linear-gradient(135deg, #031412 0%, #062824 45%, #083530 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #f0fdfa 0%, #e6faf7 42%, #ccfbf1 100%)',
  },
  {
    name: 'Розовый',
    value: 'pink',
    primary: '#db2777',
    hover: '#ec4899',
    bg: 'rgba(219,39,119,0.12)',
    border: 'rgba(219,39,119,0.35)',
    gradient: 'from-[#1f0514] via-[#3b0a24] to-[#4a0f2e]',
    gradientRaw: 'linear-gradient(135deg, #12030c 0%, #280818 45%, #360d22 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 42%, #fbcfe8 100%)',
  },
  {
    name: 'Белый',
    value: 'white',
    primary: '#64748b',
    hover: '#475569',
    bg: 'rgba(100,116,139,0.12)',
    border: 'rgba(100,116,139,0.28)',
    gradient: 'from-[#0a0a0f] via-[#111118] to-[#1a1a24]',
    gradientRaw: 'linear-gradient(135deg, #08080c 0%, #101016 45%, #181820 100%)',
    lightGradientRaw: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 42%, #e2e8f0 100%)',
  },
]

export const defaultColors: Record<SpaceRole, string> = {
  creator: 'pink',
  advertiser: 'blue',
}

const ACCENT_STORAGE_KEY: Record<SpaceRole, string> = {
  creator: 'adverlink_creator_accent',
  advertiser: 'adverlink_advertiser_accent',
}

const THEME_STORAGE_KEY: Record<SpaceRole, string> = {
  creator: 'adverlink_creator_theme',
  advertiser: 'adverlink_advertiser_theme',
}

function findAccent(value: string | null | undefined): AccentColor {
  return accentColors.find((c) => c.value === value) || accentColors[0]
}

/** WCAG-ish contrast pick for text on accent backgrounds */
export function getAccentForeground(primary: string): string {
  const hex = primary.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#0f172a' : '#ffffff'
}

export function getAccentColor(role: SpaceRole): AccentColor {
  if (typeof window === 'undefined') {
    return findAccent(defaultColors[role])
  }
  const saved = localStorage.getItem(ACCENT_STORAGE_KEY[role])
  return findAccent(saved || defaultColors[role])
}

export function saveAccentColor(role: SpaceRole, colorValue: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCENT_STORAGE_KEY[role], colorValue)
  window.dispatchEvent(new Event('adverlink-accent-change'))
}

export function getSpaceThemeMode(role: SpaceRole): SpaceThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(THEME_STORAGE_KEY[role])
  return saved === 'light' ? 'light' : 'dark'
}

export function saveSpaceThemeMode(role: SpaceRole, mode: SpaceThemeMode) {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY[role], mode)
  window.dispatchEvent(new Event('adverlink-theme-change'))
}

export function getLayoutGradient(role: SpaceRole, accent?: AccentColor, mode?: SpaceThemeMode): string {
  const color = accent ?? getAccentColor(role)
  const themeMode = mode ?? getSpaceThemeMode(role)
  return themeMode === 'light' ? color.lightGradientRaw : color.gradientRaw
}

export function applyAccentColor(color: AccentColor) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--accent-primary', color.primary)
  root.style.setProperty('--accent-hover', color.hover)
  root.style.setProperty('--accent-bg', color.bg)
  root.style.setProperty('--accent-border', color.border)
  root.style.setProperty('--accent-foreground', getAccentForeground(color.primary))
}

export function applySpaceThemeMode(mode: SpaceThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-app-theme', mode)
}

/** Apply accent + theme for the active dashboard role */
export function applySpaceAppearance(role: SpaceRole) {
  const accent = getAccentColor(role)
  const mode = getSpaceThemeMode(role)
  applyAccentColor(accent)
  applySpaceThemeMode(mode)
  document.documentElement.style.setProperty('--layout-gradient', getLayoutGradient(role, accent, mode))
  return { accent, mode, gradient: getLayoutGradient(role, accent, mode) }
}

/** @deprecated use getSpaceThemeMode */
export function getTheme(role: string) {
  return getSpaceThemeMode(role as SpaceRole)
}

/** @deprecated use saveSpaceThemeMode */
export function saveTheme(role: string, themeValue: string) {
  saveSpaceThemeMode(role as SpaceRole, themeValue.includes('light') ? 'light' : 'dark')
}

export const creatorThemes = accentColors.map((c) => ({
  name: c.name,
  value: `creator-${c.value}`,
  gradient: c.gradient,
  accent: c.primary,
}))

export const advertiserThemes = accentColors.map((c) => ({
  name: c.name,
  value: `advertiser-${c.value}`,
  gradient: c.gradient,
  accent: c.primary,
}))
