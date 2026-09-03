'use client'

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
    <div className="ui-surface ui-deal-next ui-surface--pad-sm" style={{ marginBottom: '16px' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="ui-meta mb-1">Следующий шаг</div>
          <p className="ui-body font-medium">{nextAction}</p>
        </div>
        <DealStatusPill status={request.status} />
      </div>
    </div>
  )
}
