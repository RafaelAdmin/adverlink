-- Marketplace ad request from a channel card: price snapshots, dates, private files.
-- Safe to re-run. Does not create a second price-list table.
-- Requires: public.ad_requests, public.channel_prices, public.is_deal_participant().

alter table public.ad_requests
  add column if not exists pricing_mode text;

alter table public.ad_requests drop constraint if exists ad_requests_pricing_mode_check;
alter table public.ad_requests add constraint ad_requests_pricing_mode_check
  check (pricing_mode is null or pricing_mode in ('price_list', 'custom'));

create table if not exists public.ad_request_price_snapshots (
  id uuid default gen_random_uuid() primary key,
  ad_request_id uuid not null references public.ad_requests(id) on delete cascade,
  channel_price_id uuid,
  type text not null,
  description text,
  unit_price decimal(10,2) not null,
  currency text not null,
  quantity integer not null,
  subtotal decimal(10,2) not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.ad_request_preferred_dates (
  id uuid default gen_random_uuid() primary key,
  ad_request_id uuid not null references public.ad_requests(id) on delete cascade,
  preferred_on date not null,
  created_at timestamp with time zone default now(),
  unique (ad_request_id, preferred_on)
);

create table if not exists public.ad_request_files (
  id uuid default gen_random_uuid() primary key,
  ad_request_id uuid not null references public.ad_requests(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  storage_path text not null unique,
  created_at timestamp with time zone default now()
);

create index if not exists ad_request_price_snapshots_request_idx
  on public.ad_request_price_snapshots (ad_request_id, sort_order);
create index if not exists ad_request_preferred_dates_request_idx
  on public.ad_request_preferred_dates (ad_request_id, preferred_on);
create index if not exists ad_request_files_request_idx
  on public.ad_request_files (ad_request_id);

alter table public.ad_request_price_snapshots enable row level security;
alter table public.ad_request_preferred_dates enable row level security;
alter table public.ad_request_files enable row level security;

drop policy if exists "ad_request_price_snapshots_select" on public.ad_request_price_snapshots;
create policy "ad_request_price_snapshots_select" on public.ad_request_price_snapshots
  for select using (public.is_deal_participant(ad_request_id));

drop policy if exists "ad_request_preferred_dates_select" on public.ad_request_preferred_dates;
create policy "ad_request_preferred_dates_select" on public.ad_request_preferred_dates
  for select using (public.is_deal_participant(ad_request_id));

drop policy if exists "ad_request_files_select" on public.ad_request_files;
create policy "ad_request_files_select" on public.ad_request_files
  for select using (public.is_deal_participant(ad_request_id));

-- Direct client writes are denied (no insert/update/delete policies). RPCs are SECURITY DEFINER.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-request-files',
  'ad-request-files',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ad_request_files_storage_select" on storage.objects;
create policy "ad_request_files_storage_select" on storage.objects
  for select using (
    bucket_id = 'ad-request-files'
    and exists (
      select 1
      from public.ad_request_files f
      where f.storage_path = name
        and public.is_deal_participant(f.ad_request_id)
    )
  );

drop policy if exists "ad_request_files_storage_insert" on storage.objects;
create policy "ad_request_files_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'ad-request-files'
    and auth.uid() is not null
    and exists (
      select 1
      from public.ad_request_files f
      where f.storage_path = name
        and f.uploaded_by = auth.uid()
    )
  );

create or replace function public.protect_marketplace_ad_request_insert()
returns trigger
language plpgsql
as $$
begin
  if new.campaign_id is not null then
    return new;
  end if;

  if current_user in ('service_role', 'postgres')
    or current_setting('app.allow_deal_lifecycle', true) = '1'
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  then
    return new;
  end if;

  raise exception 'Marketplace orders must be created through create_marketplace_ad_request';
end;
$$;

drop trigger if exists protect_marketplace_ad_request_insert_trigger on public.ad_requests;
create trigger protect_marketplace_ad_request_insert_trigger
  before insert on public.ad_requests
  for each row execute function public.protect_marketplace_ad_request_insert();

create or replace function public.create_marketplace_ad_request(
  p_channel_id uuid,
  p_advertiser_name text,
  p_message text,
  p_items jsonb,
  p_dates jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_channel public.channels%rowtype;
  v_profile public.profiles%rowtype;
  v_name text;
  v_message text;
  v_contact text;
  v_catalog_count int;
  v_len int;
  v_i int;
  v_item jsonb;
  v_price_id uuid;
  v_qty int;
  v_price public.channel_prices%rowtype;
  v_currency text;
  v_unit numeric;
  v_subtotal numeric;
  v_total numeric := 0;
  v_posts int := 0;
  v_mode text;
  v_date_len int;
  v_date date;
  v_today date := (timezone('utc', now()))::date;
  v_id uuid;
  v_seen uuid[] := '{}';
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  v_name := btrim(coalesce(p_advertiser_name, ''));
  if v_name = '' then
    raise exception 'Advertiser name is required';
  end if;
  v_name := left(v_name, 120);

  v_message := btrim(coalesce(p_message, ''));
  if v_message = '' then
    raise exception 'Brief description is required';
  end if;
  v_message := left(v_message, 4000);

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Price selections must be an array';
  end if;
  if p_dates is null or jsonb_typeof(p_dates) <> 'array' then
    raise exception 'Preferred dates must be an array';
  end if;

  select * into v_channel
  from public.channels
  where id = p_channel_id
  for update;

  if not found then
    raise exception 'Channel not found';
  end if;

  if v_channel.owner_id is not distinct from v_user then
    raise exception 'Cannot request ads on your own channel';
  end if;

  select * into v_profile from public.profiles where id = v_user;
  v_contact := left(coalesce(nullif(btrim(v_name), ''), 'AdverLink'), 200);

  select count(*) into v_catalog_count
  from public.channel_prices
  where channel_id = p_channel_id;

  v_len := jsonb_array_length(p_items);

  if v_catalog_count = 0 then
    if v_len > 0 then
      raise exception 'Selected services do not belong to this channel';
    end if;
    v_mode := 'custom';
  else
    if v_len = 0 then
      raise exception 'Select at least one service from the price list';
    end if;
    v_mode := 'price_list';
  end if;

  perform set_config('app.allow_deal_lifecycle', '1', true);

  insert into public.ad_requests (
    channel_id,
    advertiser_id,
    advertiser_name,
    advertiser_contact,
    advertiser_email,
    message,
    budget,
    budget_currency,
    status,
    pricing_mode,
    posts_count,
    updated_at
  ) values (
    p_channel_id,
    v_user,
    v_name,
    v_contact,
    null,
    v_message,
    null,
    null,
    'new',
    v_mode,
    1,
    now()
  )
  returning id into v_id;

  if v_mode = 'price_list' then
    for v_i in 0 .. v_len - 1 loop
      v_item := p_items -> v_i;
      if jsonb_typeof(v_item) <> 'object' then
        raise exception 'Each selected service must be an object';
      end if;

      begin
        v_price_id := (v_item ->> 'id')::uuid;
      exception when others then
        raise exception 'Selected services do not belong to this channel';
      end;

      if v_price_id = any (v_seen) then
        raise exception 'Each service can be selected only once';
      end if;
      v_seen := array_append(v_seen, v_price_id);

      begin
        v_qty := (v_item ->> 'quantity')::int;
      exception when others then
        raise exception 'Quantity must be an integer from 1 to 99';
      end;

      if v_qty is null or v_qty < 1 or v_qty > 99 then
        raise exception 'Quantity must be an integer from 1 to 99';
      end if;

      select * into v_price
      from public.channel_prices
      where id = v_price_id
        and channel_id = p_channel_id;

      if not found then
        raise exception 'Selected services do not belong to this channel';
      end if;

      v_unit := round(v_price.price, 2);
      if v_unit is null or v_unit <= 0 then
        raise exception 'Price list item is invalid';
      end if;

      v_currency := upper(btrim(coalesce(v_price.currency, '')));
      if v_currency not in ('USD', 'EUR', 'AMD', 'GEL', 'RUB') then
        raise exception 'Unsupported price list currency';
      end if;

      v_subtotal := round(v_unit * v_qty, 2);
      v_total := v_total + v_subtotal;
      v_posts := v_posts + v_qty;

      insert into public.ad_request_price_snapshots (
        ad_request_id,
        channel_price_id,
        type,
        description,
        unit_price,
        currency,
        quantity,
        subtotal,
        sort_order
      ) values (
        v_id,
        v_price.id,
        left(v_price.type, 120),
        nullif(left(coalesce(v_price.description, ''), 500), ''),
        v_unit,
        v_currency,
        v_qty,
        v_subtotal,
        coalesce(v_price.sort_order, 0)
      );
    end loop;

    if exists (
      select 1
      from public.ad_request_price_snapshots s
      where s.ad_request_id = v_id
      group by s.currency
      having count(*) > 0
    ) and (
      select count(distinct currency)
      from public.ad_request_price_snapshots
      where ad_request_id = v_id
    ) > 1 then
      raise exception 'Price list must use a single currency';
    end if;

    update public.ad_requests
    set
      budget = v_total,
      budget_currency = v_currency,
      posts_count = greatest(v_posts, 1)
    where id = v_id;
  end if;

  v_date_len := jsonb_array_length(p_dates);
  if v_date_len > 14 then
    raise exception 'Too many preferred dates';
  end if;

  for v_i in 0 .. v_date_len - 1 loop
    begin
      v_date := (p_dates ->> v_i)::date;
    exception when others then
      raise exception 'Preferred dates must use YYYY-MM-DD';
    end;

    if v_date < v_today then
      raise exception 'Preferred dates cannot be in the past';
    end if;

    insert into public.ad_request_preferred_dates (ad_request_id, preferred_on)
    values (v_id, v_date)
    on conflict (ad_request_id, preferred_on) do nothing;
  end loop;

  return v_id;
end;
$$;

create or replace function public.prepare_ad_request_file(
  p_ad_request_id uuid,
  p_original_name text,
  p_mime_type text,
  p_size_bytes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_request public.ad_requests%rowtype;
  v_count int;
  v_id uuid := gen_random_uuid();
  v_ext text;
  v_path text;
  v_name text;
  v_mime text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_request
  from public.ad_requests
  where id = p_ad_request_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_request.advertiser_id is distinct from v_user then
    raise exception 'Only the advertiser can attach files';
  end if;

  if v_request.status <> 'new' then
    raise exception 'Files can only be attached to a new request';
  end if;

  select count(*) into v_count
  from public.ad_request_files
  where ad_request_id = p_ad_request_id;

  if v_count >= 10 then
    raise exception 'Too many files';
  end if;

  v_mime := lower(btrim(coalesce(p_mime_type, '')));
  if v_mime not in (
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception 'File type is not allowed';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 then
    raise exception 'File is too large';
  end if;

  if v_mime in ('image/jpeg', 'image/png', 'image/gif', 'image/webp') and p_size_bytes > 10485760 then
    raise exception 'File is too large';
  end if;
  if v_mime in ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    and p_size_bytes > 15728640 then
    raise exception 'File is too large';
  end if;
  if v_mime in ('video/mp4', 'video/webm', 'video/quicktime') and p_size_bytes > 52428800 then
    raise exception 'File is too large';
  end if;

  v_ext := case v_mime
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/gif' then 'gif'
    when 'image/webp' then 'webp'
    when 'video/mp4' then 'mp4'
    when 'video/webm' then 'webm'
    when 'video/quicktime' then 'mov'
    when 'application/pdf' then 'pdf'
    when 'application/msword' then 'doc'
    else 'docx'
  end;

  v_name := left(btrim(coalesce(p_original_name, 'file')), 180);
  if v_name = '' then
    v_name := 'file.' || v_ext;
  end if;

  v_path := p_ad_request_id::text || '/' || v_id::text || '.' || v_ext;

  insert into public.ad_request_files (
    id,
    ad_request_id,
    uploaded_by,
    original_name,
    mime_type,
    size_bytes,
    storage_path
  ) values (
    v_id,
    p_ad_request_id,
    v_user,
    v_name,
    v_mime,
    p_size_bytes,
    v_path
  );

  return jsonb_build_object(
    'id', v_id,
    'bucket', 'ad-request-files',
    'path', v_path
  );
end;
$$;

revoke all on function public.create_marketplace_ad_request(uuid, text, text, jsonb, jsonb) from public;
grant execute on function public.create_marketplace_ad_request(uuid, text, text, jsonb, jsonb) to authenticated;

revoke all on function public.prepare_ad_request_file(uuid, text, text, integer) from public;
grant execute on function public.prepare_ad_request_file(uuid, text, text, integer) to authenticated;
