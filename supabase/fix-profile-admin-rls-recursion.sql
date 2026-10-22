-- Idempotent fix for profiles RLS recursion.
-- Drops the legacy policy that selected public.profiles from a profiles policy.
-- Production already dropped "Admins full access profiles"; this file is for
-- other environments. Safe to re-run. Does not change Marketplace views.

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

drop policy if exists "Admins full access profiles" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;

create policy "profiles_admin_all" on public.profiles
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
