-- Extend the existing public.channel_prices table (schema.sql).
-- Do not create a second price-list table.
-- Safe to re-run.

create table if not exists public.channel_prices (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade,
  type text not null,
  price decimal(10,2) not null,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.channel_prices
  add column if not exists currency text not null default 'USD',
  add column if not exists sort_order integer not null default 0;

alter table public.channel_prices enable row level security;

drop policy if exists "channel_prices_select" on public.channel_prices;
create policy "channel_prices_select" on public.channel_prices
  for select using (
    exists (
      select 1 from public.channels c
      where c.id = channel_id
        and (c.is_active = true or c.owner_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "channel_prices_insert_own" on public.channel_prices;
create policy "channel_prices_insert_own" on public.channel_prices
  for insert with check (
    exists (
      select 1 from public.channels c
      where c.id = channel_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "channel_prices_update_own" on public.channel_prices;
create policy "channel_prices_update_own" on public.channel_prices
  for update using (
    exists (
      select 1 from public.channels c
      where c.id = channel_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "channel_prices_delete_own" on public.channel_prices;
create policy "channel_prices_delete_own" on public.channel_prices
  for delete using (
    exists (
      select 1 from public.channels c
      where c.id = channel_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "channel_prices_admin_all" on public.channel_prices;
create policy "channel_prices_admin_all" on public.channel_prices
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create index if not exists channel_prices_channel_sort_idx
  on public.channel_prices (channel_id, sort_order);
