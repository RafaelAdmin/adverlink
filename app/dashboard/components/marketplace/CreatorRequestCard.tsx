'use client'

import type { AdRequest } from '@/lib/database.types'
import { CreatorDealCard } from '../DealManagement'

export default function CreatorRequestCard({
  request,
  channelMap,
  userId,
  onUpdate,
  linkToDeal,
}: {
  request: AdRequest
  channelMap: Record<string, any>
  userId: string
  onUpdate: (id: string, patch: Record<string, unknown>) => void
  linkToDeal?: boolean
}) {
  return (
    <CreatorDealCard
      request={request}
      channelMap={channelMap}
      userId={userId}
      onUpdate={onUpdate}
      linkToDeal={linkToDeal}
    />
  )
}
