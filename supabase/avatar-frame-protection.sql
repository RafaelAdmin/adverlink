-- Run in Supabase SQL Editor after security-fixes.sql and avatar-frame.sql.
-- Prevents users from setting avatar_frame_color without going through a paid purchase flow.
-- Safe to re-run.

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
    or new.avatar_frame_color is distinct from old.avatar_frame_color
  ) then
    if current_setting('app.allow_avatar_frame', true) = '1' then
      return new;
    end if;
    if not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    ) then
      raise exception 'Cannot modify privileged profile fields';
    end if;
  end if;
  return new;
end;
$$;
