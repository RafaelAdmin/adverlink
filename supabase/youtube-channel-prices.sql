-- Require a valid channel_prices row before YouTube verification / emptying the list.
-- Uses the existing public.channel_prices table. Does not create a YouTube-only prices table.
-- Does not change Telegram, deals, or payment SQL.
--
-- Existing YouTube channels without a price list stay visible; they cannot newly
-- become verified (or drop their last valid price) until a valid list exists.
--
-- Review before applying. NOT auto-applied. Idempotent.

create or replace function public.youtube_channel_has_price_list(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.channel_prices p
    where p.channel_id = p_channel_id
      and length(btrim(coalesce(p.type, ''))) > 0
      and p.price > 0
      and upper(btrim(coalesce(p.currency, ''))) in ('USD', 'EUR', 'AMD', 'GEL', 'RUB')
  );
$$;

revoke all on function public.youtube_channel_has_price_list(uuid) from public;
grant execute on function public.youtube_channel_has_price_list(uuid) to authenticated;

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
  v_is_youtube boolean;
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

  select c.platform = 'youtube'
  into v_is_youtube
  from public.channels c
  where c.id = p_channel_id
    and c.owner_id = auth.uid();

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Price list must be a JSON array';
  end if;

  v_len := jsonb_array_length(p_items);

  if coalesce(v_is_youtube, false) and v_len = 0 then
    raise exception 'YouTube channels require at least one valid price list item';
  end if;

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

create or replace function public.verify_channel_after_check(p_channel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.channels
    where id = p_channel_id and owner_id = auth.uid()
  ) then
    raise exception 'Not channel owner';
  end if;

  if exists (
    select 1 from public.channels
    where id = p_channel_id
      and owner_id = auth.uid()
      and platform = 'youtube'
  ) and not public.youtube_channel_has_price_list(p_channel_id) then
    raise exception 'YouTube channels require a price list before verification';
  end if;

  perform set_config('app.allow_verify', '1', true);

  update public.channels
  set verification_status = 'verified', is_verified = true
  where id = p_channel_id and owner_id = auth.uid();
end;
$$;

grant execute on function public.verify_channel_after_check(uuid) to authenticated;

create or replace function public.enforce_youtube_verified_has_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.platform is distinct from 'youtube' then
    return new;
  end if;

  if (
    (new.verification_status = 'verified' and old.verification_status is distinct from 'verified')
    or (coalesce(new.is_verified, false) and not coalesce(old.is_verified, false))
  ) then
    if not public.youtube_channel_has_price_list(new.id) then
      raise exception 'YouTube channels require a price list before verification';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_youtube_verified_has_prices_trigger on public.channels;
create trigger enforce_youtube_verified_has_prices_trigger
  before update on public.channels
  for each row execute function public.enforce_youtube_verified_has_prices();

create or replace function public.enforce_youtube_remaining_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel_id uuid;
begin
  v_channel_id := coalesce(new.channel_id, old.channel_id);

  if not exists (
    select 1
    from public.channels c
    where c.id = v_channel_id
      and c.platform = 'youtube'
  ) then
    return coalesce(new, old);
  end if;

  if not public.youtube_channel_has_price_list(v_channel_id) then
    raise exception 'YouTube channels require at least one valid price list item';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_youtube_remaining_prices_trigger on public.channel_prices;
create constraint trigger enforce_youtube_remaining_prices_trigger
  after insert or update or delete on public.channel_prices
  deferrable initially deferred
  for each row execute function public.enforce_youtube_remaining_prices();
