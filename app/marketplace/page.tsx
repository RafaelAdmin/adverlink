import type { Metadata } from 'next'
import PublicCatalog from './PublicCatalog'

export const metadata: Metadata = {
  title: 'Маркетплейс каналов — AdverLink',
  description: 'Публичный каталог активных каналов AdverLink. Смотрите площадки без регистрации и запрашивайте рекламу после входа.',
}

export default function MarketplacePage() {
  return <PublicCatalog />
}
