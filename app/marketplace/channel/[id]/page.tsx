import type { Metadata } from 'next'
import PublicChannelView from './PublicChannelView'

export const metadata: Metadata = {
  title: 'Канал — AdverLink',
  description: 'Публичная карточка канала в маркетплейсе AdverLink.',
}

export default function PublicChannelPage() {
  return <PublicChannelView />
}
