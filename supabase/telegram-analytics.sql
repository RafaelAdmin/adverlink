-- Telegram Analytics V1 migration
-- Safe to re-run where noted. DO NOT auto-apply to production — review first.

-- ============================================================
-- CHANNEL ANALYTICS FIELDS
-- ============================================================
alter table public.channels
  add column if not exists telegram_chat_id bigint,
  add column if not exists analytics_status text default 'disconnected',
  -- Optional auto-analytics integration state only (NOT ownership verification).
  add column if not exists analytics_connected_at timestamp with time zone,
  add column if not exists analytics_posts_tracked integer default 0,
  add column if not exists analytics_last_sync_at timestamp with time zone,
  add column if not exists analytics_avg_views_24h integer,
  add column if not exists analytics_err24_eligible_count integer default 0;

alter table public.channels drop constraint if exists channels_analytics_status_check;
alter table public.channels add constraint channels_analytics_status_check
  check (analytics_status in ('disconnected', 'connected', 'collecting', 'active', 'error'));

create index if not exists channels_analytics_status_idx
  on public.channels (analytics_status)
  where analytics_status in ('connected', 'collecting', 'active');

create index if not exists channels_telegram_chat_id_idx
  on public.channels (telegram_chat_id)
  where telegram_chat_id is not null;

-- ============================================================
-- TELEGRAM POSTS
-- ============================================================
create table if not exists public.telegram_posts (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid not null references public.channels(id) on delete cascade,
  telegram_chat_id bigint not null,
  telegram_message_id bigint not null,
  published_at timestamp with time zone not null,
  subscriber_count_at_publish integer,
  views_at_ingest integer,
  current_views integer,
  last_analytics_update timestamp with time zone,
  ad_request_id uuid references public.ad_requests(id) on delete set null,
  deal_price decimal(10,2),
  is_deleted boolean default false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (channel_id, telegram_message_id)
);

create index if not exists telegram_posts_channel_published_idx
  on public.telegram_posts (channel_id, published_at desc);

create index if not exists telegram_posts_ad_request_idx
  on public.telegram_posts (ad_request_id)
  where ad_request_id is not null;

-- ============================================================
-- POST VIEW / SUBSCRIBER SNAPSHOTS
-- ============================================================
create table if not exists public.telegram_post_snapshots (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.telegram_posts(id) on delete cascade,
  checkpoint text not null check (checkpoint in ('publication', '1h', '6h', '24h', '48h')),
  scheduled_at timestamp with time zone not null,
  captured_at timestamp with time zone,
  subscriber_count integer,
  views integer,
  views_unavailable boolean default false,
  status text not null default 'pending' check (status in ('pending', 'captured', 'skipped', 'failed')),
  created_at timestamp with time zone default now(),
  unique (post_id, checkpoint)
);

create index if not exists telegram_post_snapshots_due_idx
  on public.telegram_post_snapshots (status, scheduled_at)
  where status = 'pending';

-- ============================================================
-- RLS
-- Writes to telegram_posts / telegram_post_snapshots are intended
-- only via service_role (webhook, cron) or SECURITY DEFINER RPCs.
-- Authenticated owners/admins get SELECT only (admins: full via admin policy).
-- ============================================================
alter table public.telegram_posts enable row level security;
alter table public.telegram_post_snapshots enable row level security;

drop policy if exists "telegram_posts_select_owner" on public.telegram_posts;
create policy "telegram_posts_select_owner" on public.telegram_posts
  for select using (
    exists (
      select 1 from public.channels ch
      where ch.id = telegram_posts.channel_id
        and (
          ch.owner_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "telegram_posts_admin_all" on public.telegram_posts;
create policy "telegram_posts_admin_all" on public.telegram_posts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "telegram_post_snapshots_select_owner" on public.telegram_post_snapshots;
create policy "telegram_post_snapshots_select_owner" on public.telegram_post_snapshots
  for select using (
    exists (
      select 1 from public.telegram_posts tp
      join public.channels ch on ch.id = tp.channel_id
      where tp.id = telegram_post_snapshots.post_id
        and (
          ch.owner_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "telegram_post_snapshots_admin_all" on public.telegram_post_snapshots;
create policy "telegram_post_snapshots_admin_all" on public.telegram_post_snapshots
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- PROTECT PRIVILEGED CHANNEL COLUMNS (field-scoped bypasses)
-- app.allow_verify       -> verification_status, is_verified only
-- app.allow_analytics_sync -> analytics/metrics fields only
-- is_featured, rating    -> admin only (never flag-bypassed)
-- ============================================================
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
  ) then
    if current_setting('app.allow_verify', true) <> '1' and not v_is_admin then
      raise exception 'Cannot modify verification fields directly';
    end if;
  end if;

  if (
    new.is_featured is distinct from old.is_featured
    or new.rating is distinct from old.rating
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

-- ============================================================
-- RPC: CONNECT TELEGRAM ANALYTICS (service role / trusted API only)
-- Telegram chat ID is resolved server-side; p_owner_id is verified after API auth.
-- ============================================================
create or replace function public.connect_telegram_analytics(
  p_channel_id uuid,
  p_telegram_chat_id bigint,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_owner_id is null then
    raise exception 'Owner id required';
  end if;

  if not exists (
    select 1 from public.channels
    where id = p_channel_id
      and owner_id = p_owner_id
      and verification_status = 'verified'
      and (platform = 'telegram' or platform is null)
  ) then
    raise exception 'Channel not eligible for analytics';
  end if;

  perform set_config('app.allow_analytics_sync', '1', true);

  update public.channels
  set
    telegram_chat_id = p_telegram_chat_id,
    analytics_status = 'connected',
    analytics_connected_at = coalesce(analytics_connected_at, now())
  where id = p_channel_id and owner_id = p_owner_id;
end;
$$;

revoke all on function public.connect_telegram_analytics(uuid, bigint, uuid) from public;
revoke all on function public.connect_telegram_analytics(uuid, bigint, uuid) from anon;
revoke all on function public.connect_telegram_analytics(uuid, bigint, uuid) from authenticated;
grant execute on function public.connect_telegram_analytics(uuid, bigint, uuid) to service_role;

-- ============================================================
-- RPC: SYNC CHANNEL ANALYTICS (service role / cron only)
-- ============================================================
create or replace function public.sync_channel_analytics_metrics(
  p_channel_id uuid,
  p_subscriber_count integer,
  p_avg_views integer,
  p_engagement_rate decimal,
  p_analytics_status text,
  p_posts_tracked integer,
  p_avg_views_24h integer,
  p_err24_eligible_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_analytics_status is not null
    and p_analytics_status not in ('disconnected', 'connected', 'collecting', 'active', 'error')
  then
    raise exception 'Invalid analytics_status';
  end if;

  perform set_config('app.allow_analytics_sync', '1', true);

  update public.channels
  set
    subscriber_count = coalesce(p_subscriber_count, subscriber_count),
    avg_views = coalesce(p_avg_views, avg_views),
    engagement_rate = coalesce(p_engagement_rate, engagement_rate),
    analytics_status = coalesce(p_analytics_status, analytics_status),
    analytics_posts_tracked = coalesce(p_posts_tracked, analytics_posts_tracked),
    analytics_avg_views_24h = p_avg_views_24h,
    analytics_err24_eligible_count = coalesce(p_err24_eligible_count, 0),
    analytics_last_sync_at = now()
  where id = p_channel_id;
end;
$$;

revoke all on function public.sync_channel_analytics_metrics(uuid, integer, integer, decimal, text, integer, integer, integer) from public;
revoke all on function public.sync_channel_analytics_metrics(uuid, integer, integer, decimal, text, integer, integer, integer) from anon;
revoke all on function public.sync_channel_analytics_metrics(uuid, integer, integer, decimal, text, integer, integer, integer) from authenticated;
grant execute on function public.sync_channel_analytics_metrics(uuid, integer, integer, decimal, text, integer, integer, integer) to service_role;

-- ============================================================
-- RPC: ASSOCIATE DEAL POST (creator on deal; post must exist)
-- ============================================================
create or replace function public.associate_telegram_post_deal(
  p_channel_id uuid,
  p_message_id bigint,
  p_ad_request_id uuid,
  p_deal_price decimal
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.channels ch
    join public.ad_requests ar on ar.channel_id = ch.id
    where ch.id = p_channel_id
      and ar.id = p_ad_request_id
      and ch.owner_id = auth.uid()
  ) then
    raise exception 'Not authorized for this deal';
  end if;

  select id into v_post_id
  from public.telegram_posts
  where channel_id = p_channel_id and telegram_message_id = p_message_id;

  if v_post_id is null then
    raise exception 'Telegram post has not been observed by analytics yet';
  end if;

  update public.telegram_posts
  set ad_request_id = p_ad_request_id, deal_price = p_deal_price
  where id = v_post_id;

  return v_post_id;
end;
$$;

revoke all on function public.associate_telegram_post_deal(uuid, bigint, uuid, decimal) from public;
revoke all on function public.associate_telegram_post_deal(uuid, bigint, uuid, decimal) from anon;
grant execute on function public.associate_telegram_post_deal(uuid, bigint, uuid, decimal) to authenticated;
grant execute on function public.associate_telegram_post_deal(uuid, bigint, uuid, decimal) to service_role;
