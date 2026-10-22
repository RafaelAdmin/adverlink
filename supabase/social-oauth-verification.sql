-- TikTok / Instagram OAuth account verification.
-- Run in Supabase SQL Editor after schema.sql and security-fixes.sql.
-- Does not store access_token or refresh_token.

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

alter table public.channels
  add column if not exists external_account_id text,
  add column if not exists verification_expires_at timestamptz;

create unique index if not exists channels_platform_external_account_unique
  on public.channels (platform, external_account_id)
  where external_account_id is not null;

create table if not exists public.oauth_verification_sessions (
  id uuid default gen_random_uuid() primary key,
  state text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  code_verifier text not null,
  return_path text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists oauth_verification_sessions_expires_idx
  on public.oauth_verification_sessions (expires_at);

alter table public.oauth_verification_sessions enable row level security;

create table if not exists public.social_account_verifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  external_account_id text not null,
  username text,
  profile_url text,
  display_name text,
  avatar_url text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'expired', 'error')),
  verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (platform, external_account_id),
  unique (channel_id)
);

alter table public.social_account_verifications enable row level security;

drop policy if exists "social_verifications_select_own" on public.social_account_verifications;
create policy "social_verifications_select_own" on public.social_account_verifications
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.channels c
      where c.id = channel_id and c.owner_id = auth.uid()
    )
    or public.current_user_is_admin()
  );

drop policy if exists "social_verifications_admin_all" on public.social_account_verifications;
create policy "social_verifications_admin_all" on public.social_account_verifications
  for all using (
    public.current_user_is_admin()
  );

-- No policies on oauth_verification_sessions: authenticated clients cannot read PKCE verifiers.
-- Service role (OAuth callback) bypasses RLS.

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
    or new.external_account_id is distinct from old.external_account_id
    or new.verification_expires_at is distinct from old.verification_expires_at
  ) then
    if current_setting('app.allow_verify', true) = '1' then
      return new;
    end if;
    if not public.current_user_is_admin() then
      raise exception 'Cannot modify privileged channel fields directly';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.complete_social_account_verification(
  p_user_id uuid,
  p_channel_id uuid,
  p_platform text,
  p_external_account_id text,
  p_username text,
  p_profile_url text,
  p_display_name text,
  p_avatar_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel public.channels%rowtype;
  v_existing public.social_account_verifications%rowtype;
  v_expires timestamptz;
  v_username text;
begin
  if p_platform not in ('tiktok', 'instagram') then
    return jsonb_build_object('ok', false, 'reason', 'platform_mismatch');
  end if;

  if p_external_account_id is null or length(trim(p_external_account_id)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_external_id');
  end if;

  select * into v_channel from public.channels where id = p_channel_id;
  if v_channel.id is null then
    return jsonb_build_object('ok', false, 'reason', 'channel_not_found');
  end if;

  if v_channel.owner_id is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if coalesce(v_channel.platform, '') is distinct from p_platform then
    return jsonb_build_object('ok', false, 'reason', 'platform_mismatch');
  end if;

  select * into v_existing
  from public.social_account_verifications
  where platform = p_platform
    and external_account_id = p_external_account_id
  for update;

  if v_existing.id is not null and v_existing.channel_id is distinct from p_channel_id then
    if v_existing.status = 'verified'
      and v_existing.verification_expires_at is not null
      and v_existing.verification_expires_at > now()
    then
      return jsonb_build_object('ok', false, 'reason', 'already_linked');
    end if;

    perform set_config('app.allow_verify', '1', true);

    update public.channels
    set
      is_verified = false,
      verification_status = 'expired',
      external_account_id = null,
      verification_expires_at = null
    where id = v_existing.channel_id;

    delete from public.social_account_verifications where id = v_existing.id;
  end if;

  delete from public.social_account_verifications
  where channel_id = p_channel_id
    and not (platform = p_platform and external_account_id = p_external_account_id);

  v_expires := now() + interval '90 days';
  v_username := nullif(trim(both '@' from coalesce(p_username, '')), '');

  perform set_config('app.allow_verify', '1', true);

  insert into public.social_account_verifications (
    user_id,
    channel_id,
    platform,
    external_account_id,
    username,
    profile_url,
    display_name,
    avatar_url,
    status,
    verified_at,
    verification_expires_at,
    updated_at
  ) values (
    p_user_id,
    p_channel_id,
    p_platform,
    p_external_account_id,
    v_username,
    p_profile_url,
    p_display_name,
    p_avatar_url,
    'verified',
    now(),
    v_expires,
    now()
  )
  on conflict (platform, external_account_id) do update set
    user_id = excluded.user_id,
    channel_id = excluded.channel_id,
    username = excluded.username,
    profile_url = excluded.profile_url,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    status = 'verified',
    verified_at = now(),
    verification_expires_at = v_expires,
    updated_at = now();

  update public.channels
  set
    verification_status = 'verified',
    is_verified = true,
    external_account_id = p_external_account_id,
    verification_expires_at = v_expires,
    telegram_username = coalesce(v_username, telegram_username),
    name = case
      when coalesce(name, '') = '' then coalesce(nullif(p_display_name, ''), name)
      else name
    end,
    avatar_url = coalesce(nullif(p_avatar_url, ''), avatar_url),
    platform_url = coalesce(nullif(p_profile_url, ''), platform_url)
  where id = p_channel_id;

  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

revoke all on function public.complete_social_account_verification(
  uuid, uuid, text, text, text, text, text, text
) from public;
revoke all on function public.complete_social_account_verification(
  uuid, uuid, text, text, text, text, text, text
) from authenticated;
grant execute on function public.complete_social_account_verification(
  uuid, uuid, text, text, text, text, text, text
) to service_role;
