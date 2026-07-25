-- Run this in Supabase SQL Editor to apply security hardening.
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where needed.

-- ============================================================
-- MESSAGES TABLE (deal chat)
-- ============================================================
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.ad_requests(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null check (char_length(content) <= 2000),
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create or replace function public.is_deal_participant(p_deal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ad_requests ar
    left join public.channels ch on ch.id = ar.channel_id
    where ar.id = p_deal_id
      and (
        ar.advertiser_id = auth.uid()
        or ch.owner_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin = true
        )
      )
  );
$$;

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants" on public.messages
  for select using (public.is_deal_participant(deal_id));

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_deal_participant(deal_id)
  );

drop policy if exists "messages_admin_all" on public.messages;
create policy "messages_admin_all" on public.messages
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- PROTECT PRIVILEGED PROFILE COLUMNS
-- ============================================================
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

-- ============================================================
-- PROTECT PRIVILEGED CHANNEL COLUMNS (verification, featured)
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
  ) then
    if current_setting('app.allow_verify', true) = '1' then
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

drop trigger if exists protect_channel_columns_trigger on public.channels;
create trigger protect_channel_columns_trigger
  before update on public.channels
  for each row execute function public.protect_channel_columns();

-- NOTE: After this trigger, verification must go through a SECURITY DEFINER RPC.
-- See verify_channel_after_check() below.

create or replace function public.verify_channel_after_check(p_channel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.channels
    where id = p_channel_id and owner_id = auth.uid()
  ) then
    raise exception 'Not channel owner';
  end if;

  perform set_config('app.allow_verify', '1', true);

  update public.channels
  set verification_status = 'verified', is_verified = true
  where id = p_channel_id and owner_id = auth.uid();
end;
$$;

grant execute on function public.verify_channel_after_check(uuid) to authenticated;

-- ============================================================
-- TIGHTEN AD_REQUESTS INSERT
-- ============================================================
drop policy if exists "ad_requests_insert" on public.ad_requests;
create policy "ad_requests_insert" on public.ad_requests
  for insert with check (
    auth.uid() is not null
    and (advertiser_id = auth.uid() or advertiser_id is null)
  );

-- ============================================================
-- REVIEWS: require completed deal
-- ============================================================
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.ad_requests ar
      left join public.channels ch on ch.id = ar.channel_id
      where ar.id = deal_id
        and ar.status in ('completed', 'replied')
        and (
          ar.advertiser_id = auth.uid()
          or ch.owner_id = auth.uid()
        )
    )
  );
