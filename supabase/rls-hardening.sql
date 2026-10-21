-- Idempotent RLS hardening. Do NOT run on production until explicitly confirmed.
-- Prerequisites: schema.sql + security-fixes.sql (is_deal_participant).
-- Safe to re-run. Does not change Marketplace SELECT on categories, channels, or channel_prices.
-- Source of truth for which tables still have RLS off: supabase/rls-audit.sql on the target DB.

-- ---------------------------------------------------------------------------
-- oauth_verification_sessions
-- PKCE code_verifier. No client policies. OAuth routes use service_role (bypass RLS).
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.oauth_verification_sessions') is null then
    return;
  end if;

  execute 'alter table public.oauth_verification_sessions enable row level security';

  execute 'revoke all privileges on table public.oauth_verification_sessions from public';
  execute 'revoke all privileges on table public.oauth_verification_sessions from anon';
  execute 'revoke all privileges on table public.oauth_verification_sessions from authenticated';

  execute 'drop policy if exists "oauth_verification_sessions_no_client_select" on public.oauth_verification_sessions';
  execute 'drop policy if exists "oauth_verification_sessions_select_own" on public.oauth_verification_sessions';
  execute 'drop policy if exists "oauth_verification_sessions_all" on public.oauth_verification_sessions';
end
$$;

-- ---------------------------------------------------------------------------
-- deal_chat_reads
-- Same statements as supabase/deal-chat-reads.sql (versioned source of truth).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- deal_messages (legacy, unused by the app; live chat uses public.messages)
-- Enable RLS and deny anon/authenticated. No client policies.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.deal_messages') is null then
    return;
  end if;

  execute 'alter table public.deal_messages enable row level security';
  execute 'revoke all privileges on table public.deal_messages from public';
  execute 'revoke all privileges on table public.deal_messages from anon';
  execute 'revoke all privileges on table public.deal_messages from authenticated';

  execute 'drop policy if exists "deal_messages_select_participant" on public.deal_messages';
  execute 'drop policy if exists "deal_messages_insert_participant" on public.deal_messages';
  execute 'drop policy if exists "deal_messages_admin_all" on public.deal_messages';
end
$$;
