-- Deal live updates via Supabase Realtime (postgres_changes).
-- Review before applying. NOT auto-applied. Do not run against production from app deploys.
--
-- Does NOT change RLS, deal statuses, payments, or 90/10 split.
-- Participants still only receive rows they can SELECT (is_deal_participant / existing policies).
--
-- Replica identity FULL is required so UPDATE events include old-row columns
-- that RLS uses when evaluating the change for the subscriber.
--
-- Idempotent: safe to re-run.

alter table public.ad_requests replica identity full;
alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ad_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.ad_requests';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;
