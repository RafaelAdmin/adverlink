-- Phase C. Run AFTER rls-public-views.sql and AFTER the new frontend is deployed.
-- Enables RLS on the eight audit tables and installs owner/admin policies.
-- Does not create marketplace views or channel_is_listed (those live in rls-public-views.sql).
-- Idempotent. Do not run on production until explicitly confirmed.

-- =============================================================================
-- Enable RLS (only these eight tables)
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.channels enable row level security;
alter table public.campaigns enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.deals enable row level security;
alter table public.deal_messages enable row level security;

-- =============================================================================
-- Privileged-column triggers
-- =============================================================================
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if (
    new.is_admin is distinct from old.is_admin
    or new.is_founder is distinct from old.is_founder
    or new.subscription_plan is distinct from old.subscription_plan
    or new.level is distinct from old.level
    or new.level_deals is distinct from old.level_deals
    or new.avatar_frame_color is distinct from old.avatar_frame_color
  ) then
    if not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    ) then
      raise exception 'Cannot modify privileged profile fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns_trigger on public.profiles;
create trigger protect_profile_columns_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.protect_channel_columns()
returns trigger
language plpgsql
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  );

  if (
    new.verification_status is distinct from old.verification_status
    or new.is_verified is distinct from old.is_verified
    or new.external_account_id is distinct from old.external_account_id
    or new.verification_expires_at is distinct from old.verification_expires_at
  ) then
    if current_setting('app.allow_verify', true) <> '1' and not v_is_admin then
      raise exception 'Cannot modify verification fields directly';
    end if;
  end if;

  if (
    new.is_featured is distinct from old.is_featured
    or new.rating is distinct from old.rating
    or new.is_promoted is distinct from old.is_promoted
    or new.completed_deals is distinct from old.completed_deals
    or new.total_views is distinct from old.total_views
  ) then
    if not v_is_admin then
      raise exception 'Cannot modify privileged channel fields directly';
    end if;
  end if;

  if (
    new.subscriber_count is distinct from old.subscriber_count
    or new.avg_views is distinct from old.avg_views
    or new.engagement_rate is distinct from old.engagement_rate
    or new.analytics_status is distinct from old.analytics_status
    or new.analytics_connected_at is distinct from old.analytics_connected_at
    or new.analytics_posts_tracked is distinct from old.analytics_posts_tracked
    or new.analytics_last_sync_at is distinct from old.analytics_last_sync_at
    or new.analytics_avg_views_24h is distinct from old.analytics_avg_views_24h
    or new.analytics_err24_eligible_count is distinct from old.analytics_err24_eligible_count
    or new.telegram_chat_id is distinct from old.telegram_chat_id
  ) then
    if current_setting('app.allow_analytics_sync', true) <> '1' and not v_is_admin then
      raise exception 'Cannot modify analytics fields directly';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_channel_columns_trigger on public.channels;
create trigger protect_channel_columns_trigger
  before update on public.channels
  for each row execute function public.protect_channel_columns();

-- =============================================================================
-- profiles
-- =============================================================================
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- =============================================================================
-- categories
-- =============================================================================
drop policy if exists "categories_select_all" on public.categories;
drop policy if exists "categories_admin_all" on public.categories;

create policy "categories_select_all" on public.categories
  for select using (true);

create policy "categories_admin_all" on public.categories
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- =============================================================================
-- channels (table): owner + admin only
-- =============================================================================
drop policy if exists "channels_select" on public.channels;
drop policy if exists "channels_insert_own" on public.channels;
drop policy if exists "channels_update_own" on public.channels;
drop policy if exists "channels_delete_own" on public.channels;
drop policy if exists "channels_admin_all" on public.channels;

create policy "channels_select" on public.channels
  for select using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "channels_insert_own" on public.channels
  for insert with check (
    auth.uid() = owner_id
    and coalesce(is_verified, false) = false
    and coalesce(is_featured, false) = false
    and coalesce(verification_status, 'pending') in ('pending')
  );

create policy "channels_update_own" on public.channels
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "channels_delete_own" on public.channels
  for delete using (auth.uid() = owner_id);

create policy "channels_admin_all" on public.channels
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- =============================================================================
-- campaigns (table): owner + admin only
-- =============================================================================
drop policy if exists "campaigns_select" on public.campaigns;
drop policy if exists "campaigns_insert_own" on public.campaigns;
drop policy if exists "campaigns_update_own" on public.campaigns;
drop policy if exists "campaigns_delete_own" on public.campaigns;
drop policy if exists "campaigns_admin_all" on public.campaigns;

create policy "campaigns_select" on public.campaigns
  for select using (
    advertiser_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "campaigns_insert_own" on public.campaigns
  for insert with check (auth.uid() = advertiser_id);

create policy "campaigns_update_own" on public.campaigns
  for update
  using (auth.uid() = advertiser_id)
  with check (auth.uid() = advertiser_id);

create policy "campaigns_delete_own" on public.campaigns
  for delete using (auth.uid() = advertiser_id);

create policy "campaigns_admin_all" on public.campaigns
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- =============================================================================
-- reviews
-- =============================================================================
drop policy if exists "reviews_select" on public.reviews;
drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;
drop policy if exists "reviews_admin_all" on public.reviews;

create policy "reviews_select" on public.reviews
  for select using (true);

create policy "reviews_insert_own" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.ad_requests ar
      left join public.channels ch on ch.id = ar.channel_id
      where ar.id = deal_id
        and ar.status in ('completed', 'replied')
        and (
          ar.advertiser_id = auth.uid()
          or ch.owner_id = auth.uid()
        )
    )
  );

create policy "reviews_update_own" on public.reviews
  for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

create policy "reviews_delete_own" on public.reviews
  for delete using (auth.uid() = reviewer_id);

create policy "reviews_admin_all" on public.reviews
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- =============================================================================
-- subscriptions
-- =============================================================================
drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_delete_own" on public.subscriptions;
drop policy if exists "subscriptions_admin_all" on public.subscriptions;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "subscriptions_admin_all" on public.subscriptions
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- =============================================================================
-- deals + deal_messages (legacy)
-- =============================================================================
drop policy if exists "deals_select" on public.deals;
drop policy if exists "deals_insert_own" on public.deals;
drop policy if exists "deals_update" on public.deals;
drop policy if exists "deals_admin_all" on public.deals;

drop policy if exists "deal_messages_select_participant" on public.deal_messages;
drop policy if exists "deal_messages_insert_participant" on public.deal_messages;
drop policy if exists "deal_messages_admin_all" on public.deal_messages;
