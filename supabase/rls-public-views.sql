-- Phase A. Safe while table RLS is still OFF and the old frontend still reads
-- public.channels / public.campaigns. Does not ENABLE RLS and does not change
-- policies on profiles, channels, campaigns, reviews, or subscriptions.
-- Idempotent. Do not run on production until explicitly confirmed.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to anon, authenticated, service_role;

create or replace function public.channel_is_listed(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.channels
    where id = p_channel_id and is_active = true
  );
$$;

revoke all on function public.channel_is_listed(uuid) from public;
grant execute on function public.channel_is_listed(uuid) to anon, authenticated, service_role;

create or replace view public.marketplace_channels
with (security_invoker = false, security_barrier = true)
as
select
  c.id,
  c.owner_id,
  c.category_id,
  c.name,
  c.telegram_username,
  c.description,
  c.avatar_url,
  c.subscriber_count,
  c.avg_views,
  c.engagement_rate,
  c.language,
  c.country,
  c.ad_price,
  c.ad_price_currency,
  c.is_verified,
  c.is_active,
  c.is_featured,
  c.verification_status,
  c.platform,
  c.platform_url,
  c.posting_frequency,
  c.analytics_status,
  c.analytics_posts_tracked,
  c.analytics_avg_views_24h,
  c.analytics_err24_eligible_count,
  c.rating,
  c.created_at,
  jsonb_build_object(
    'subscription_plan', p.subscription_plan,
    'is_admin', p.is_admin
  ) as owner_profile
from public.channels c
left join public.profiles p on p.id = c.owner_id
where c.is_active = true;

create or replace view public.marketplace_campaigns
with (security_invoker = false, security_barrier = true)
as
select
  camp.id,
  camp.advertiser_id,
  camp.name,
  camp.description,
  camp.budget,
  camp.product_link,
  camp.target_audience,
  camp.preferred_date,
  camp.category,
  camp.min_subscribers,
  camp.requirements,
  camp.status,
  camp.slots_total,
  camp.slots_filled,
  camp.preferred_social_networks,
  camp.collection_deadline,
  camp.brief,
  camp.created_at,
  jsonb_build_object(
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'subscription_plan', p.subscription_plan,
    'is_admin', p.is_admin
  ) as advertiser_profile
from public.campaigns camp
left join public.profiles p on p.id = camp.advertiser_id
where camp.status in ('active', 'collecting', 'in_progress');

revoke all on public.marketplace_channels from public, anon, authenticated;
revoke all on public.marketplace_campaigns from public, anon, authenticated;
grant select on public.marketplace_channels to anon, authenticated, service_role;
grant select on public.marketplace_campaigns to anon, authenticated, service_role;

drop policy if exists "channel_prices_select" on public.channel_prices;
create policy "channel_prices_select" on public.channel_prices
  for select using (
    public.channel_is_listed(channel_id)
    or exists (
      select 1 from public.channels c
      where c.id = channel_id and c.owner_id = auth.uid()
    )
    or public.current_user_is_admin()
  );
