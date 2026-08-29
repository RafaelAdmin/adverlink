'use client'

import { glassDealCard } from '@/lib/deals'
import { getDealNextAction } from '@/lib/final-review-ui'
import type { AdRequest, DealMaterial, DealPlacement } from '@/lib/database.types'
import { DealStatusPill } from '@/app/dashboard/components/DealManagement'

type DealNextActionProps = {
  request: AdRequest
  placements: DealPlacement[]
  material: DealMaterial | null
  role: 'creator' | 'advertiser'
}

export default function DealNextAction({
  request,
  placements,
  material,
  role,
}: DealNextActionProps) {
  const nextAction = getDealNextAction(request, placements, material, role)

  return (
    <div style={{ ...glassDealCard, padding: '16px 20px', marginBottom: '16px' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white/45 text-xs mb-1">Следующий шаг</div>
          <p className="text-white text-sm font-medium">{nextAction}</p>
        </div>
        <DealStatusPill status={request.status} />
      </div>
    </div>
  )
}
