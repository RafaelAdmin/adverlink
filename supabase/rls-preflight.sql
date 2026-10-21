-- READ ONLY. Run in SQL Editor before production apply.
-- Inspect each result grid. Does not ENABLE RLS, create views, or change grants.

-- 1) Columns required by marketplace views and protect_* triggers
with required(table_name, column_name, used_by) as (
  values
    ('channels', 'id', 'views+listed'),
    ('channels', 'owner_id', 'views'),
    ('channels', 'category_id', 'views'),
    ('channels', 'name', 'views'),
    ('channels', 'telegram_username', 'views'),
    ('channels', 'description', 'views'),
    ('channels', 'avatar_url', 'views'),
    ('channels', 'subscriber_count', 'views+trigger'),
    ('channels', 'avg_views', 'views+trigger'),
    ('channels', 'engagement_rate', 'views+trigger'),
    ('channels', 'language', 'views'),
    ('channels', 'country', 'views'),
    ('channels', 'ad_price', 'views'),
    ('channels', 'ad_price_currency', 'views'),
    ('channels', 'is_verified', 'views+trigger'),
    ('channels', 'is_active', 'views+listed'),
    ('channels', 'is_featured', 'views+trigger'),
    ('channels', 'verification_status', 'views+trigger'),
    ('channels', 'platform', 'views'),
    ('channels', 'platform_url', 'views'),
    ('channels', 'posting_frequency', 'views'),
    ('channels', 'analytics_status', 'views+trigger'),
    ('channels', 'analytics_posts_tracked', 'views+trigger'),
    ('channels', 'analytics_avg_views_24h', 'views+trigger'),
    ('channels', 'analytics_err24_eligible_count', 'views+trigger'),
    ('channels', 'analytics_connected_at', 'trigger'),
    ('channels', 'analytics_last_sync_at', 'trigger'),
    ('channels', 'rating', 'views+trigger'),
    ('channels', 'created_at', 'views'),
    ('channels', 'external_account_id', 'trigger'),
    ('channels', 'verification_expires_at', 'trigger'),
    ('channels', 'is_promoted', 'trigger'),
    ('channels', 'completed_deals', 'trigger'),
    ('channels', 'total_views', 'trigger'),
    ('channels', 'telegram_chat_id', 'trigger'),
    ('campaigns', 'id', 'views'),
    ('campaigns', 'advertiser_id', 'views'),
    ('campaigns', 'name', 'views'),
    ('campaigns', 'description', 'views'),
    ('campaigns', 'budget', 'views'),
    ('campaigns', 'product_link', 'views'),
    ('campaigns', 'target_audience', 'views'),
    ('campaigns', 'preferred_date', 'views'),
    ('campaigns', 'category', 'views'),
    ('campaigns', 'min_subscribers', 'views'),
    ('campaigns', 'requirements', 'views'),
    ('campaigns', 'status', 'views'),
    ('campaigns', 'slots_total', 'views'),
    ('campaigns', 'slots_filled', 'views'),
    ('campaigns', 'preferred_social_networks', 'views'),
    ('campaigns', 'collection_deadline', 'views'),
    ('campaigns', 'brief', 'views'),
    ('campaigns', 'created_at', 'views'),
    ('profiles', 'id', 'views+trigger'),
    ('profiles', 'full_name', 'views'),
    ('profiles', 'avatar_url', 'views'),
    ('profiles', 'subscription_plan', 'views+trigger'),
    ('profiles', 'is_admin', 'views+trigger'),
    ('profiles', 'is_founder', 'trigger'),
    ('profiles', 'level', 'trigger'),
    ('profiles', 'level_deals', 'trigger'),
    ('profiles', 'avatar_frame_color', 'trigger')
)
select
  r.table_name,
  r.column_name,
  r.used_by,
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = r.table_name
      and c.column_name = r.column_name
  ) as column_exists
from required r
order by
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = r.table_name
      and c.column_name = r.column_name
  ),
  r.table_name,
  r.column_name;

-- 2) Protect triggers
select
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  t.tgenabled as enabled
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and not t.tgisinternal
  and t.tgname in (
    'protect_profile_columns_trigger',
    'protect_channel_columns_trigger'
  )
order by t.tgname;

select unnest(array[
  'protect_profile_columns_trigger',
  'protect_channel_columns_trigger'
]) as expected_trigger
except
select t.tgname
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal;

-- 3) RLS status of the eight tables
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'categories',
    'channels',
    'campaigns',
    'reviews',
    'subscriptions',
    'deals',
    'deal_messages'
  )
order by c.relname;

-- 4) Grants on marketplace views (empty until rls-public-views.sql has been run)
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('marketplace_channels', 'marketplace_campaigns')
  and grantee in ('anon', 'authenticated', 'public', 'service_role')
group by table_name, grantee
order by table_name, grantee;

-- 5) View owners (empty until views exist)
select
  n.nspname as schema,
  c.relname as view_name,
  pg_catalog.pg_get_userbyid(c.relowner) as owner,
  c.relkind
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname in ('marketplace_channels', 'marketplace_campaigns')
order by c.relname;
