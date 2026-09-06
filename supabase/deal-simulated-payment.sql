-- Simulated Beta deal payment fields (ad_requests)
-- Review before applying to production. NOT auto-applied.
--
-- Prerequisites: ad_requests table (schema.sql), deal-lifecycle-phase0.sql recommended
--
-- Adds payment audit columns for simulated (Beta) and future real provider payments.
-- Does NOT modify or drop the existing payment_status column.
--
-- Safe to re-run where noted (IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================
-- A. AD_REQUESTS — simulated / real payment audit columns
-- ============================================================

alter table public.ad_requests
  add column if not exists payment_mode text,
  add column if not exists payment_amount numeric(12, 2),
  add column if not exists payment_currency text,
  add column if not exists paid_at timestamp with time zone,
  add column if not exists payment_provider text,
  add column if not exists payment_environment text,
  add column if not exists payment_reference text;

-- Drop/recreate CHECK constraints (idempotent)
alter table public.ad_requests drop constraint if exists ad_requests_payment_mode_check;
alter table public.ad_requests add constraint ad_requests_payment_mode_check
  check (
    payment_mode is null
    or payment_mode in ('simulated', 'real')
  );

alter table public.ad_requests drop constraint if exists ad_requests_payment_currency_check;
alter table public.ad_requests add constraint ad_requests_payment_currency_check
  check (
    payment_currency is null
    or payment_currency in ('USD', 'EUR', 'AMD', 'GEL', 'RUB')
  );

create unique index if not exists ad_requests_payment_reference_unique
  on public.ad_requests (payment_reference)
  where payment_reference is not null;

comment on column public.ad_requests.payment_mode is
  'simulated = Beta test payment; real = future provider payment.';
comment on column public.ad_requests.payment_amount is
  'Agreed amount recorded at payment time (from final terms, server-side).';
comment on column public.ad_requests.payment_currency is
  'Currency code at payment time; matches supported AdverLink currencies.';
comment on column public.ad_requests.paid_at is
  'Timestamp when payment was confirmed (simulated or real).';
comment on column public.ad_requests.payment_provider is
  'Payment backend identifier (e.g. simulated, stripe).';
comment on column public.ad_requests.payment_environment is
  'Deployment context (e.g. beta, production).';
comment on column public.ad_requests.payment_reference is
  'Internal reference (e.g. SIM-XXXXXXXX). Not a bank/provider transaction id.';
