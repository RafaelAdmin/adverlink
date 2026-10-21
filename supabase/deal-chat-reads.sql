-- Versioned DDL for public.deal_chat_reads (unread markers in deal chat).
-- Prerequisites: schema.sql + security-fixes.sql (profiles, ad_requests, is_deal_participant).
-- Idempotent. Does not change Marketplace SELECT on categories/channels/channel_prices.

create table if not exists public.deal_chat_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.ad_requests(id) on delete cascade,
  last_read_at timestamp with time zone not null default now(),
  primary key (user_id, deal_id)
);

alter table public.deal_chat_reads enable row level security;

revoke all on table public.deal_chat_reads from public;
revoke all on table public.deal_chat_reads from anon;
revoke all on table public.deal_chat_reads from authenticated;
grant select, insert, update on table public.deal_chat_reads to authenticated;

drop policy if exists "Users manage own chat reads" on public.deal_chat_reads;
drop policy if exists "deal_chat_reads_select_own" on public.deal_chat_reads;
drop policy if exists "deal_chat_reads_insert_own" on public.deal_chat_reads;
drop policy if exists "deal_chat_reads_update_own" on public.deal_chat_reads;
drop policy if exists "deal_chat_reads_admin_select" on public.deal_chat_reads;
drop policy if exists "deal_chat_reads_all" on public.deal_chat_reads;

create policy "deal_chat_reads_select_own" on public.deal_chat_reads
  for select using (
    auth.uid() = user_id
    and public.is_deal_participant(deal_id)
  );

create policy "deal_chat_reads_insert_own" on public.deal_chat_reads
  for insert with check (
    auth.uid() = user_id
    and public.is_deal_participant(deal_id)
  );

create policy "deal_chat_reads_update_own" on public.deal_chat_reads
  for update using (
    auth.uid() = user_id
    and public.is_deal_participant(deal_id)
  ) with check (
    auth.uid() = user_id
    and public.is_deal_participant(deal_id)
  );
