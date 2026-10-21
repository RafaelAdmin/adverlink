import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_SECRET_COLUMNS,
  CHANNEL_SECRET_COLUMNS,
  MARKETPLACE_CAMPAIGNS_VIEW,
  MARKETPLACE_CHANNELS_VIEW,
  publicCampaignAdvertiserContact,
} from '../marketplace-public'

const viewsSql = readFileSync(resolve(process.cwd(), 'supabase/rls-public-views.sql'), 'utf8')
const recoverySql = readFileSync(resolve(process.cwd(), 'supabase/rls-core-recovery.sql'), 'utf8')

function viewDefinition(sql: string, viewName: string) {
  const start = sql.indexOf(`create or replace view public.${viewName}`)
  expect(start).toBeGreaterThan(-1)
  const nextCreate = sql.indexOf('create or replace view public.', start + 1)
  const nextSection = sql.indexOf('revoke all on public.', start + 40)
  const end = Math.min(
    nextCreate === -1 ? sql.length : nextCreate,
    nextSection === -1 ? sql.length : nextSection,
  )
  return sql.slice(start, end).toLowerCase()
}

describe('marketplace public views SQL', () => {
  it('defines listing views without enabling table RLS', () => {
    expect(viewsSql).toContain(`create or replace view public.${MARKETPLACE_CHANNELS_VIEW}`)
    expect(viewsSql).toContain(`create or replace view public.${MARKETPLACE_CAMPAIGNS_VIEW}`)
    expect(viewsSql).toContain('security_invoker = false')
    expect(viewsSql).not.toMatch(/enable row level security/i)
    expect(viewsSql).not.toMatch(/drop policy if exists "channels_select"/)
    expect(viewsSql).not.toMatch(/drop policy if exists "campaigns_select"/)
    expect(viewsSql).not.toMatch(/protect_profile_columns/)
    expect(viewsSql).not.toMatch(/protect_channel_columns/)
  })

  it('omits secret channel columns from the public channel view', () => {
    const def = viewDefinition(viewsSql, MARKETPLACE_CHANNELS_VIEW)
    for (const column of CHANNEL_SECRET_COLUMNS) {
      expect(def).not.toContain(column)
    }
  })

  it('omits advertiser_email from the public campaign view', () => {
    const def = viewDefinition(viewsSql, MARKETPLACE_CAMPAIGNS_VIEW)
    for (const column of CAMPAIGN_SECRET_COLUMNS) {
      expect(def).not.toContain(column)
    }
  })

  it('keeps recovery SQL free of view recreation', () => {
    expect(recoverySql).not.toContain('create or replace view public.marketplace_channels')
    expect(recoverySql).not.toContain('create or replace function public.channel_is_listed')
    expect(recoverySql).not.toContain('channel_prices_select')
  })

  it('restricts table SELECT on channels and campaigns to owner or admin', () => {
    expect(recoverySql).toMatch(
      /create policy "channels_select" on public.channels\s+for select using \(\s*owner_id = auth\.uid\(\)/,
    )
    expect(recoverySql).not.toMatch(
      /create policy "channels_select" on public.channels\s+for select using \(\s*is_active = true/,
    )
    expect(recoverySql).toMatch(
      /create policy "campaigns_select" on public.campaigns\s+for select using \(\s*advertiser_id = auth\.uid\(\)/,
    )
    expect(recoverySql).not.toMatch(
      /create policy "campaigns_select" on public.campaigns\s+for select using \(\s*status in/,
    )
  })

  it('protects promotion and lifetime stats on channel UPDATE', () => {
    expect(recoverySql).toContain('new.is_promoted is distinct from old.is_promoted')
    expect(recoverySql).toContain('new.completed_deals is distinct from old.completed_deals')
    expect(recoverySql).toContain('new.total_views is distinct from old.total_views')
  })
})

describe('publicCampaignAdvertiserContact', () => {
  it('always returns advertiser_email null', () => {
    expect(
      publicCampaignAdvertiserContact({
        name: 'Spring launch',
        advertiser_profile: { full_name: 'Ada' },
      }),
    ).toEqual({
      advertiser_contact: 'Ada',
      advertiser_email: null,
    })
    expect(
      publicCampaignAdvertiserContact({
        name: 'No profile',
      }).advertiser_email,
    ).toBeNull()
  })
})
