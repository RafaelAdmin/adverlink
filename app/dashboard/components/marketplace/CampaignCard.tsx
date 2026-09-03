'use client'

import Link from 'next/link'
import type { Campaign } from '@/lib/database.types'
import { toUsdEstimate } from '@/lib/currency'
import { getSlotsLabel, isCampaignCollecting, SOCIAL_NETWORK_OPTIONS } from '@/lib/campaigns'

const CARD_HEIGHT = 260

export default function CampaignCard({
  campaign,
}: {
  campaign: Campaign
}) {
  const budgetUsd = toUsdEstimate(campaign.budget)
  const advertiser = campaign.advertiser_profile
  const advertiserName =
    advertiser?.full_name || campaign.advertiser_email?.split('@')[0] || 'Рекламодатель'
  const collecting = isCampaignCollecting(campaign)
  const networks = campaign.preferred_social_networks || []

  return (
    <Link
      href={`/dashboard/campaign/${campaign.id}`}
      className="hover-border-accent transition cursor-pointer"
      style={{ height: '100%', display: 'block' }}
    >
      <div
        className="channel-card-inner ui-surface ui-surface--pad-md"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: `${CARD_HEIGHT}px`,
          maxHeight: `${CARD_HEIGHT}px`,
        }}
      >
        {/* Top: advertiser avatar + name + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
          {advertiser?.avatar_url ? (
            <img
              src={advertiser.avatar_url}
              alt={advertiserName}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary, #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                flexShrink: 0,
              }}
            >
              {advertiserName[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ui-meta" style={{ fontSize: '11px', marginBottom: '2px' }}>Рекламодатель</div>
            <div className="ui-card-title truncate">{advertiserName}</div>
          </div>
          {advertiser?.is_admin ? (
            <span style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)', color: '#f87171', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>
              ADMIN
            </span>
          ) : advertiser?.subscription_plan === 'pro' ? (
            <span style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)', color: '#fbbf24', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>
              PRO
            </span>
          ) : null}
        </div>

        {/* Middle: campaign name + description */}
        <div style={{ flexShrink: 0, marginBottom: '12px' }}>
          <div className="ui-card-title truncate mb-1.5">{campaign.name}</div>
          <p className="ui-meta m-0" style={{ height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
            {campaign.description || 'Без описания'}
          </p>
        </div>

        {/* Bottom badges row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', flexShrink: 0 }}>
          <span style={{ background: 'rgba(147,51,234,0.15)', color: '#c4b5fd', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(147,51,234,0.25)' }}>
            {Number(campaign.budget).toLocaleString()} AMD
          </span>
          {campaign.category && (
            <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {campaign.category}
            </span>
          )}
          <span style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.2)' }}>
            {getSlotsLabel(campaign)}
          </span>
          {campaign.min_subscribers > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', padding: '3px 8px', borderRadius: '20px' }}>
              от {campaign.min_subscribers.toLocaleString()} подп.
            </span>
          )}
        </div>

        {/* Social icons + deadline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(networks.length > 0 ? networks : ['telegram']).map((net) => {
              const opt = SOCIAL_NETWORK_OPTIONS.find((o) => o.value === net)
              return (
                <span
                  key={net}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className={`ti ${opt?.icon || 'ti-share'}`} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }} />
                </span>
              )
            })}
          </div>
          {campaign.collection_deadline && (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
              до {new Date(campaign.collection_deadline).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span className="ui-meta text-xs">
            ≈ ${budgetUsd}
          </span>
          <span
            className={`ui-btn ui-btn--primary ui-btn--sm ${collecting ? '' : 'opacity-50'}`}
          >
            {collecting ? 'Откликнуться' : 'Закрыта'}
          </span>
        </div>
      </div>
    </Link>
  )
}
