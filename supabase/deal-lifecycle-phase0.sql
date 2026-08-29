-- Deal lifecycle Phase 0 migration
-- Review before applying to production. NOT auto-applied.
--
-- Prerequisites: security-fixes.sql (is_deal_participant), telegram-analytics.sql
--
-- Adds orthogonal sub-state columns on ad_requests, deal_placements,
-- and deal_materials. Does NOT rewrite existing status values, does NOT
-- backfill placement rows, and does NOT modify reviews rows or FKs.
--
-- Lifecycle field writes on ad_requests require one of:
--   current_user in ('service_role', 'postgres')  — direct backend / SQL editor
--   current_setting('app.allow_deal_lifecycle', true) = '1'  — controlled SECURITY DEFINER RPC
--   authenticated admin (profiles.is_admin)
-- Same family of pattern as app.allow_verify / app.allow_analytics_sync.
--
-- Safe to re-run where noted (IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================
-- A. AD_REQUESTS — orthogonal lifecycle columns
-- ============================================================

alter table public.ad_requests
  add column if not exists content_mode text,
  add column if not exists budget_currency text,
  add column if not exists final_price numeric(12, 2),
  add column if not exists final_price_currency text,
  add column if not exists placements_count integer,
  add column if not exists placement_start_at timestamp with time zone,
  add column if not exists placement_end_at timestamp with time zone,
  add column if not exists terms_status text not null default 'none',
  add column if not exists final_terms jsonb,
  add column if not exists final_terms_proposed_by uuid references public.profiles(id) on delete set null,
  add column if not exists final_terms_proposed_at timestamp with time zone,
  add column if not exists final_terms_accepted_at timestamp with time zone,
  add column if not exists terms_locked_at timestamp with time zone,
  add column if not exists content_status text not null default 'not_required',
  add column if not exists content_submitted_at timestamp with time zone,
  add column if not exists content_approved_at timestamp with time zone,
  add column if not exists all_placements_published_at timestamp with time zone,
  add column if not exists final_review_started_at timestamp with time zone,
  add column if not exists auto_complete_deadline timestamp with time zone;

-- Drop/recreate CHECK constraints (idempotent)
alter table public.ad_requests drop constraint if exists ad_requests_content_mode_check;
alter table public.ad_requests add constraint ad_requests_content_mode_check
  check (
    content_mode is null
    or content_mode in ('advertiser_provides', 'creator_creates')
  );

alter table public.ad_requests drop constraint if exists ad_requests_budget_currency_check;
alter table public.ad_requests add constraint ad_requests_budget_currency_check
  check (
    budget_currency is null
    or budget_currency in ('USD', 'EUR', 'AMD', 'GEL', 'RUB')
  );

alter table public.ad_requests drop constraint if exists ad_requests_final_price_currency_check;
alter table public.ad_requests add constraint ad_requests_final_price_currency_check
  check (
    final_price_currency is null
    or final_price_currency in ('USD', 'EUR', 'AMD', 'GEL', 'RUB')
  );

alter table public.ad_requests drop constraint if exists ad_requests_placements_count_check;
alter table public.ad_requests add constraint ad_requests_placements_count_check
  check (
    placements_count is null
    or placements_count >= 1
  );

alter table public.ad_requests drop constraint if exists ad_requests_terms_status_check;
alter table public.ad_requests add constraint ad_requests_terms_status_check
  check (
    terms_status in ('none', 'proposed', 'accepted', 'locked')
  );

alter table public.ad_requests drop constraint if exists ad_requests_content_status_check;
alter table public.ad_requests add constraint ad_requests_content_status_check
  check (
    content_status in (
      'not_required',
      'pending',
      'submitted',
      'changes_requested',
      'approved'
    )
  );

alter table public.ad_requests drop constraint if exists ad_requests_final_price_check;
alter table public.ad_requests add constraint ad_requests_final_price_check
  check (
    final_price is null
    or final_price >= 0
  );

alter table public.ad_requests drop constraint if exists ad_requests_placement_period_check;
alter table public.ad_requests add constraint ad_requests_placement_period_check
  check (
    placement_start_at is null
    or placement_end_at is null
    or placement_end_at >= placement_start_at
  );

comment on column public.ad_requests.content_mode is
  'Who produces ad content: advertiser_provides or creator_creates.';
comment on column public.ad_requests.budget_currency is
  'Original request currency (source of truth). Never converted in storage.';
comment on column public.ad_requests.final_price is
  'Negotiated final total price in final_price_currency.';
comment on column public.ad_requests.final_price_currency is
  'Currency of final_price (source of truth).';
comment on column public.ad_requests.placements_count is
  'Agreed number of placements (>= 1 when set). Distinct from legacy posts_count.';
comment on column public.ad_requests.placement_start_at is
  'Start of agreed placement period.';
comment on column public.ad_requests.placement_end_at is
  'End of agreed placement period.';
comment on column public.ad_requests.terms_status is
  'Final terms negotiation: none | proposed | accepted | locked.';
comment on column public.ad_requests.final_terms is
  'Optional JSON snapshot of extra negotiated details. Core commercial fields live in columns.';
comment on column public.ad_requests.terms_locked_at is
  'When commercial terms became immutable (set after payment in future phases).';
comment on column public.ad_requests.content_status is
  'Creator-content approval workflow. Default not_required for legacy rows.';
comment on column public.ad_requests.all_placements_published_at is
  'Timestamp when the last placement was published.';
comment on column public.ad_requests.final_review_started_at is
  'When deal entered final advertiser review (all placements published).';
comment on column public.ad_requests.auto_complete_deadline is
  'Auto-complete deadline (target: 48h after final placement). Set by guarded API.';

create index if not exists ad_requests_terms_status_idx
  on public.ad_requests (terms_status)
  where terms_status in ('proposed', 'accepted');

create index if not exists ad_requests_content_status_idx
  on public.ad_requests (content_status)
  where content_status in ('pending', 'submitted', 'changes_requested');

create index if not exists ad_requests_final_review_idx
  on public.ad_requests (status, auto_complete_deadline)
  where auto_complete_deadline is not null;

-- ============================================================
-- Protect lifecycle columns on ad_requests (INSERT + UPDATE)
-- service_role / postgres     -> direct trusted backend writes
-- app.allow_deal_lifecycle    -> controlled SECURITY DEFINER RPC bypass
-- is_admin                    -> explicit admin override
-- Legacy fields (status, proof_links, posts_count, notes, etc.) are NOT gated.
-- ============================================================
create or replace function public.protect_ad_request_lifecycle_fields()
returns trigger
language plpgsql
as $$
declare
  v_is_admin boolean;
  v_trusted boolean;
  v_lifecycle_touched boolean;
begin
  v_is_admin := exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  );
  v_trusted := current_user in ('service_role', 'postgres')
    or current_setting('app.allow_deal_lifecycle', true) = '1'
    or v_is_admin;

  if TG_OP = 'INSERT' then
    v_lifecycle_touched := (
      new.content_mode is not null
      or new.budget_currency is not null
      or new.final_price is not null
      or new.final_price_currency is not null
      or new.placements_count is not null
      or new.placement_start_at is not null
      or new.placement_end_at is not null
      or coalesce(new.terms_status, 'none') is distinct from 'none'
      or new.final_terms is not null
      or new.final_terms_proposed_by is not null
      or new.final_terms_proposed_at is not null
      or new.final_terms_accepted_at is not null
      or new.terms_locked_at is not null
      or coalesce(new.content_status, 'not_required') is distinct from 'not_required'
      or new.content_submitted_at is not null
      or new.content_approved_at is not null
      or new.all_placements_published_at is not null
      or new.final_review_started_at is not null
      or new.auto_complete_deadline is not null
    );

    if v_lifecycle_touched and not v_trusted then
      raise exception 'Cannot set deal lifecycle fields directly';
    end if;

    return new;
  end if;

  -- UPDATE: terms_locked_at may never be changed by ordinary clients (including first set)
  if not v_trusted and new.terms_locked_at is distinct from old.terms_locked_at then
    raise exception 'Cannot modify terms_locked_at';
  end if;

  if not v_trusted then
    v_lifecycle_touched := (
      new.content_mode is distinct from old.content_mode
      or new.budget_currency is distinct from old.budget_currency
      or new.final_price is distinct from old.final_price
      or new.final_price_currency is distinct from old.final_price_currency
      or new.placements_count is distinct from old.placements_count
      or new.placement_start_at is distinct from old.placement_start_at
      or new.placement_end_at is distinct from old.placement_end_at
      or new.terms_status is distinct from old.terms_status
      or new.final_terms is distinct from old.final_terms
      or new.final_terms_proposed_by is distinct from old.final_terms_proposed_by
      or new.final_terms_proposed_at is distinct from old.final_terms_proposed_at
      or new.final_terms_accepted_at is distinct from old.final_terms_accepted_at
      or new.content_status is distinct from old.content_status
      or new.content_submitted_at is distinct from old.content_submitted_at
      or new.content_approved_at is distinct from old.content_approved_at
      or new.all_placements_published_at is distinct from old.all_placements_published_at
      or new.final_review_started_at is distinct from old.final_review_started_at
      or new.auto_complete_deadline is distinct from old.auto_complete_deadline
    );

    if v_lifecycle_touched then
      raise exception 'Cannot modify deal lifecycle fields directly';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_ad_request_locked_terms_trigger on public.ad_requests;
drop trigger if exists protect_ad_request_lifecycle_fields_trigger on public.ad_requests;
create trigger protect_ad_request_lifecycle_fields_trigger
  before insert or update on public.ad_requests
  for each row execute function public.protect_ad_request_lifecycle_fields();
-- ============================================================
-- C. DEAL_PLACEMENTS
-- ============================================================
create table if not exists public.deal_placements (
  id uuid default gen_random_uuid() primary key,
  ad_request_id uuid not null references public.ad_requests(id) on delete cascade,
  placement_index integer not null,
  status text not null default 'scheduled',
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  proof_url text,
  telegram_message_id bigint,
  telegram_post_id uuid references public.telegram_posts(id) on delete set null,
  issue_reported_at timestamp with time zone,
  issue_reported_by uuid references public.profiles(id) on delete set null,
  issue_comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (ad_request_id, placement_index),
  constraint deal_placements_index_check check (placement_index >= 1),
  constraint deal_placements_status_check check (
    status in ('scheduled', 'awaiting_publication', 'published', 'issue_reported')
  )
);

comment on table public.deal_placements is
  'Per-placement execution tracking for multi-placement deals.';
comment on column public.deal_placements.proof_url is
  'Public proof URL (e.g. t.me/channel/123). Set by guarded API.';
comment on column public.deal_placements.issue_reported_by is
  'Advertiser who reported a problem. Set by guarded API only.';

create index if not exists deal_placements_ad_request_idx
  on public.deal_placements (ad_request_id);

create index if not exists deal_placements_ad_request_status_idx
  on public.deal_placements (ad_request_id, status);

create index if not exists deal_placements_telegram_post_idx
  on public.deal_placements (telegram_post_id)
  where telegram_post_id is not null;

-- ============================================================
-- E. DEAL_MATERIALS
-- ============================================================
create table if not exists public.deal_materials (
  id uuid default gen_random_uuid() primary key,
  ad_request_id uuid not null unique references public.ad_requests(id) on delete cascade,
  body_text text,
  destination_url text,
  attachments jsonb,
  creator_submission_text text,
  change_request_comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.deal_materials is
  'Structured deal content: advertiser material or creator submission (single current version).';
comment on column public.deal_materials.attachments is
  'Optional file metadata array, e.g. [{ "url", "name", "mime_type", "size_bytes" }].';

create index if not exists deal_materials_ad_request_idx
  on public.deal_materials (ad_request_id);

-- ============================================================
-- I. UPDATED_AT — no project-wide trigger exists; one shared fn
-- ============================================================
create or replace function public.touch_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists deal_placements_touch_updated_at on public.deal_placements;
create trigger deal_placements_touch_updated_at
  before update on public.deal_placements
  for each row execute function public.touch_row_updated_at();

drop trigger if exists deal_materials_touch_updated_at on public.deal_materials;
create trigger deal_materials_touch_updated_at
  before update on public.deal_materials
  for each row execute function public.touch_row_updated_at();

-- ============================================================
-- F. RLS — SELECT for participants and admins; NO browser writes
-- service_role writes directly (trusted DB role, bypasses RLS).
-- Controlled SECURITY DEFINER RPCs may use app.allow_deal_lifecycle on ad_requests.
-- Authenticated admins do NOT receive direct table write privileges.
-- ============================================================
alter table public.deal_placements enable row level security;
alter table public.deal_materials enable row level security;

drop policy if exists "deal_placements_select_participant" on public.deal_placements;
create policy "deal_placements_select_participant" on public.deal_placements
  for select using (public.is_deal_participant(ad_request_id));

drop policy if exists "deal_placements_admin_all" on public.deal_placements;
drop policy if exists "deal_placements_admin_select" on public.deal_placements;
create policy "deal_placements_admin_select" on public.deal_placements
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "deal_materials_select_participant" on public.deal_materials;
create policy "deal_materials_select_participant" on public.deal_materials
  for select using (public.is_deal_participant(ad_request_id));

drop policy if exists "deal_materials_admin_all" on public.deal_materials;
drop policy if exists "deal_materials_admin_select" on public.deal_materials;
create policy "deal_materials_admin_select" on public.deal_materials
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Table privileges: revoke everything from browser roles; grant SELECT only.
-- service_role retains default postgres grants and bypasses RLS — do not revoke.
revoke all on table public.deal_placements from public;
revoke all on table public.deal_placements from authenticated;
revoke all on table public.deal_placements from anon;
grant select on table public.deal_placements to authenticated;

revoke all on table public.deal_materials from public;
revoke all on table public.deal_materials from authenticated;
revoke all on table public.deal_materials from anon;
grant select on table public.deal_materials to authenticated;