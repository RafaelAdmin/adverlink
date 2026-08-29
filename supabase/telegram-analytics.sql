-- Telegram Analytics V1 migration
-- Safe to re-run where noted. DO NOT auto-apply to production — review first.

-- ============================================================
-- CHANNEL ANALYTICS FIELDS
-- ============================================================
alter table public.channels
  add column if not exists telegram_chat_id bigint,
  add column if not exists analytics_status text default 'disconnected',
  add column if not exists analytics_connected_at timestamp with time zone,
  add column if not exists analytics_posts_tracked integer default 0,
  add column if not exists analytics_last_sync_at timestamp with time zone,
  add column if not exists analytics_avg_views_24h integer,
  add column if not exists analytics_err24_eligible_count integer default 0;

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
-- PROTECT CHANNEL ANALYTICS COLUMNS
-- ============================================================
create or replace function public.protect_channel_columns()
returns trigger
language plpgsql
as $$
begin
  if (
    new.verification_status is distinct from old.verification_status
    or new.is_verified is distinct from old.is_verified
    or new.is_featured is distinct from old.is_featured
    or new.rating is distinct from old.rating
    or new.subscriber_count is distinct from old.subscriber_count
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
    if current_setting('app.allow_verify', true) = '1' then
      return new;
    end if;
    if current_setting('app.allow_analytics_sync', true) = '1' then
      return new;
    end if;
    if not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    ) then
      raise exception 'Cannot modify privileged channel fields directly';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- RPC: CONNECT TELEGRAM ANALYTICS (owner only)
-- ============================================================
create or replace function public.connect_telegram_analytics(
  p_channel_id uuid,
  p_telegram_chat_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.channels
    where id = p_channel_id
      and owner_id = auth.uid()
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
  where id = p_channel_id and owner_id = auth.uid();
end;
$$;

grant execute on function public.connect_telegram_analytics(uuid, bigint) to authenticated;

-- ============================================================
-- RPC: SYNC CHANNEL ANALYTICS (service / cron via service role)
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
grant execute on function public.sync_channel_analytics_metrics(uuid, integer, integer, decimal, text, integer, integer, integer) to service_role;

-- ============================================================
-- RPC: ASSOCIATE DEAL POST (creator on deal)
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
    insert into public.telegram_posts (
      channel_id,
      telegram_chat_id,
      telegram_message_id,
      published_at,
      ad_request_id,
      deal_price
    )
    select
      p_channel_id,
      coalesce(ch.telegram_chat_id, 0),
      p_message_id,
      now(),
      p_ad_request_id,
      p_deal_price
    from public.channels ch
    where ch.id = p_channel_id
    returning id into v_post_id;
  else
    update public.telegram_posts
    set ad_request_id = p_ad_request_id, deal_price = p_deal_price
    where id = v_post_id;
  end if;

  return v_post_id;
end;
$$;

grant execute on function public.associate_telegram_post_deal(uuid, bigint, uuid, decimal) to authenticated;
