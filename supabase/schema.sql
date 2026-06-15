-- ================================================
-- AdverLink Database Schema
-- Run this on a fresh Supabase project to set up everything
-- ================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ================================================
-- TABLES
-- ================================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  username text,
  avatar_url text,
  description text,
  active_role text default 'advertiser',
  subscription_plan text default 'free',
  is_admin boolean default false,
  is_founder boolean default false,
  level text default 'new',
  level_deals integer default 0,
  friends_count integer default 0,
  created_at timestamp with time zone default now()
);

create unique index if not exists profiles_username_unique 
  on public.profiles(username) where username is not null;

create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  icon text,
  created_at timestamp with time zone default now()
);

create table if not exists public.channels (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  telegram_username text not null unique,
  description text,
  avatar_url text,
  banner_url text,
  subscriber_count integer default 0,
  avg_views integer default 0,
  engagement_rate decimal(5,2) default 0,
  language text default 'ru',
  country text default 'AM',
  ad_price decimal(10,2),
  contact_telegram text,
  is_verified boolean default false,
  is_active boolean default true,
  is_featured boolean default false,
  verification_status text default 'pending',
  verification_code text,
  level text default 'new',
  completed_deals integer default 0,
  rating decimal(3,2) default 0,
  is_promoted boolean default false,
  posting_frequency text,
  total_views integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.channel_prices (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade,
  type text not null,
  price decimal(10,2) not null,
  description text,
  created_at timestamp with time zone default now()
);

create table if not exists public.campaigns (
  id uuid default gen_random_uuid() primary key,
  advertiser_id uuid references public.profiles(id) on delete cascade,
  advertiser_email text,
  name text not null,
  description text,
  budget decimal(12,2),
  product_link text,
  target_audience text,
  preferred_date date,
  category text default 'Другое',
  min_subscribers integer default 0,
  requirements text,
  channel_ids jsonb,
  status text default 'active',
  created_at timestamp with time zone default now()
);

create table if not exists public.ad_requests (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  advertiser_id uuid references public.profiles(id) on delete set null,
  advertiser_name text not null,
  advertiser_contact text not null,
  advertiser_email text,
  message text not null,
  budget decimal(10,2),
  status text default 'new',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.deals (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id),
  advertiser_id uuid references public.profiles(id),
  status text default 'pending',
  placements integer default 1,
  price_per_placement decimal(10,2),
  total_price decimal(10,2),
  product_link text,
  description text,
  requirements text,
  preferred_date date,
  proof_link text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.deal_messages (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.deals(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  message text not null,
  message_type text default 'text',
  created_at timestamp with time zone default now()
);

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.deals(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete cascade,
  reviewee_id uuid references public.profiles(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now()
);

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  plan text not null default 'free',
  role text not null default 'creator',
  status text not null default 'active',
  started_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  is_founder boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade,
  addressee_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  unique(requester_id, addressee_id)
);

create table if not exists public.blocked_users (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(blocker_id, blocked_id)
);

-- ================================================
-- DEFAULT DATA
-- ================================================

insert into public.categories (name, slug, icon) values
  ('Новости', 'news', '📰'),
  ('Технологии', 'tech', '💻'),
  ('Бизнес', 'business', '💼'),
  ('Развлечения', 'entertainment', '🎬'),
  ('Спорт', 'sport', '⚽'),
  ('Образование', 'education', '📚'),
  ('Lifestyle', 'lifestyle', '✨'),
  ('Юмор', 'humor', '😂'),
  ('Другое', 'other', '📌')
on conflict (slug) do nothing;

-- ================================================
-- TRIGGER: auto-create profile on user signup
-- ================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.channels enable row level security;
alter table public.channel_prices enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_requests enable row level security;
alter table public.deals enable row level security;
alter table public.deal_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.friendships enable row level security;
alter table public.blocked_users enable row level security;

-- PROFILES
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- CATEGORIES
create policy "categories_select_all" on public.categories
  for select using (true);
create policy "categories_admin_all" on public.categories
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- CHANNELS
create policy "channels_select" on public.channels
  for select using (is_active = true or owner_id = auth.uid());
create policy "channels_insert_own" on public.channels
  for insert with check (auth.uid() = owner_id);
create policy "channels_update_own" on public.channels
  for update using (auth.uid() = owner_id);
create policy "channels_delete_own" on public.channels
  for delete using (auth.uid() = owner_id);
create policy "channels_admin_all" on public.channels
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- CAMPAIGNS
create policy "campaigns_select" on public.campaigns
  for select using (status = 'active' or auth.uid() = advertiser_id);
create policy "campaigns_insert_own" on public.campaigns
  for insert with check (auth.uid() = advertiser_id);
create policy "campaigns_update_own" on public.campaigns
  for update using (auth.uid() = advertiser_id);
create policy "campaigns_delete_own" on public.campaigns
  for delete using (auth.uid() = advertiser_id);
create policy "campaigns_admin_all" on public.campaigns
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- AD REQUESTS
create policy "ad_requests_select" on public.ad_requests
  for select using (
    advertiser_id = auth.uid()
    or channel_id in (select id from public.channels where owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "ad_requests_insert" on public.ad_requests
  for insert with check (auth.uid() is not null);
create policy "ad_requests_update" on public.ad_requests
  for update using (
    advertiser_id = auth.uid()
    or channel_id in (select id from public.channels where owner_id = auth.uid())
  );
create policy "ad_requests_admin_all" on public.ad_requests
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- REVIEWS
create policy "reviews_select" on public.reviews
  for select using (
    reviewer_id = auth.uid()
    or reviewee_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = reviewer_id);
create policy "reviews_admin_all" on public.reviews
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- FRIENDSHIPS
create policy "friendships_select" on public.friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships_insert_own" on public.friendships
  for insert with check (auth.uid() = requester_id);
create policy "friendships_update" on public.friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- BLOCKED USERS
create policy "blocked_select_own" on public.blocked_users
  for select using (blocker_id = auth.uid());
create policy "blocked_insert_own" on public.blocked_users
  for insert with check (auth.uid() = blocker_id);
create policy "blocked_delete_own" on public.blocked_users
  for delete using (auth.uid() = blocker_id);

-- SUBSCRIPTIONS
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

-- DEALS
create policy "deals_select" on public.deals
  for select using (
    advertiser_id = auth.uid()
    or channel_id in (select id from public.channels where owner_id = auth.uid())
  );
create policy "deals_insert_own" on public.deals
  for insert with check (auth.uid() = advertiser_id);
create policy "deals_update" on public.deals
  for update using (
    advertiser_id = auth.uid()
    or channel_id in (select id from public.channels where owner_id = auth.uid())
  );

-- ================================================
-- STORAGE POLICIES
-- (Run after creating 'avatars' bucket in dashboard)
-- ================================================

-- create policy "avatars_select_all" on storage.objects
--   for select using (bucket_id = 'avatars');
-- create policy "avatars_insert_auth" on storage.objects
--   for insert with check (bucket_id = 'avatars' and auth.uid() is not null);
-- create policy "avatars_update_auth" on storage.objects
--   for update using (bucket_id = 'avatars' and auth.uid() is not null);
-- create policy "avatars_delete_auth" on storage.objects
--   for delete using (bucket_id = 'avatars' and auth.uid() is not null);

-- ================================================
-- MAKE YOURSELF ADMIN (run separately after signup)
-- ================================================
-- update profiles set is_admin = true
-- where id = (select id from auth.users where email = 'your@email.com');
