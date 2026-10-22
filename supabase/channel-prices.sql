-- Extend the existing public.channel_prices table (schema.sql).
-- Do not create a second price-list table.
-- Safe to re-run.

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
    or public.current_user_is_admin()
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
  for all using (public.current_user_is_admin());

create index if not exists channel_prices_channel_sort_idx
  on public.channel_prices (channel_id, sort_order);

-- Replace the whole list atomically (delete + insert + starting price in one transaction).
create or replace function public.replace_channel_prices(
  p_channel_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_len int;
  v_i int;
  v_item jsonb;
  v_type text;
  v_price numeric;
  v_currency text;
  v_list_currency text;
  v_min_price numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.channels c
    where c.id = p_channel_id
      and c.owner_id = auth.uid()
  ) then
    raise exception 'Not channel owner';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Price list must be a JSON array';
  end if;

  v_len := jsonb_array_length(p_items);

  for v_i in 0 .. v_len - 1 loop
    v_item := p_items -> v_i;
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Each price list item must be an object';
    end if;

    v_type := btrim(coalesce(v_item ->> 'type', ''));
    if v_type = '' then
      raise exception 'Each price list item needs a name';
    end if;

    begin
      v_price := round((v_item ->> 'price')::numeric, 2);
    exception when others then
      raise exception 'Each price must be a number greater than 0';
    end;

    if v_price is null or v_price <= 0 then
      raise exception 'Each price must be a number greater than 0';
    end if;

    v_currency := upper(btrim(coalesce(v_item ->> 'currency', '')));
    if v_currency not in ('USD', 'EUR', 'AMD', 'GEL', 'RUB') then
      raise exception 'Unsupported price list currency';
    end if;

    if v_list_currency is null then
      v_list_currency := v_currency;
    elsif v_currency <> v_list_currency then
      raise exception 'Price list must use a single currency';
    end if;

    if v_min_price is null or v_price < v_min_price then
      v_min_price := v_price;
    end if;
  end loop;

  delete from public.channel_prices
  where channel_id = p_channel_id;

  if v_len > 0 then
    insert into public.channel_prices (
      channel_id,
      type,
      description,
      price,
      currency,
      sort_order
    )
    select
      p_channel_id,
      left(btrim(item ->> 'type'), 120),
      nullif(left(btrim(coalesce(item ->> 'description', '')), 500), ''),
      round((item ->> 'price')::numeric, 2),
      upper(btrim(item ->> 'currency')),
      (ord - 1)::int
    from jsonb_array_elements(p_items) with ordinality as t(item, ord);
  end if;

  update public.channels
  set
    ad_price = v_min_price,
    ad_price_currency = coalesce(v_list_currency, ad_price_currency)
  where id = p_channel_id
    and owner_id = auth.uid();
end;
$$;

revoke all on function public.replace_channel_prices(uuid, jsonb) from public;
grant execute on function public.replace_channel_prices(uuid, jsonb) to authenticated;
