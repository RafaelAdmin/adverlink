const USD_RATE = 385

export function formatAmd(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  return `${value.toLocaleString('ru-RU')} AMD`
}

export function formatAmdWithUsd(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  if (value <= 0) return '0 AMD'
  const usd = Math.round(value / USD_RATE)
  return `${value.toLocaleString('ru-RU')} AMD ≈ $${usd}`
}

export function toUsdEstimate(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  return Math.round(value / USD_RATE)
}
