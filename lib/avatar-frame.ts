export const AVATAR_FRAME_OPTIONS = [
  { id: 'blue', label: 'Синий', color: '#2563eb' },
  { id: 'yellow', label: 'Жёлтый', color: '#eab308' },
  { id: 'green', label: 'Зелёный', color: '#22c55e' },
] as const

export type AvatarFrameColorId = (typeof AVATAR_FRAME_OPTIONS)[number]['id']

export function getAvatarFrameCssColor(frameColor: string | null | undefined): string | undefined {
  return AVATAR_FRAME_OPTIONS.find((o) => o.id === frameColor)?.color
}

export const AVATAR_FRAME_PRICE_EUR = 1.99
