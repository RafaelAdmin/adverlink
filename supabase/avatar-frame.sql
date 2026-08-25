-- Run in Supabase SQL Editor.
-- Safe to re-run.

alter table public.profiles
  add column if not exists avatar_frame_color text null;

comment on column public.profiles.avatar_frame_color is 'Purchased avatar frame: blue, yellow, or green';
