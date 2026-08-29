-- Preferred display currency (user account setting)
-- Review before applying to production. Not auto-applied.

alter table public.profiles
  add column if not exists preferred_currency text;

alter table public.profiles
  drop constraint if exists profiles_preferred_currency_check;

alter table public.profiles
  add constraint profiles_preferred_currency_check
  check (
    preferred_currency is null
    or preferred_currency in ('USD', 'EUR', 'AMD', 'GEL', 'RUB')
  );

comment on column public.profiles.preferred_currency is
  'Authenticated user display currency for converted monetary values in the UI.';

-- Existing profiles_update_own policy allows users to update their own row.
