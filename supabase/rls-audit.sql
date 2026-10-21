-- READ ONLY. Do not apply as a migration.
-- Run in the SQL Editor (local or a copy). Inspect the result grids.
-- Does not enable RLS, create policies, or change grants.

-- 1) Ordinary public tables with RLS disabled (Advisor: rls_disabled_in_public)
select
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- 2) Table grants for anon and authenticated
select
  table_schema,
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'public')
group by table_schema, table_name, grantee
order by table_name, grantee;

-- 3) Columns whose names look sensitive (Advisor: sensitive_columns_exposed)
select
  n.nspname as schema,
  c.relname as table_name,
  a.attname as column_name,
  c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_attribute a on a.attrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and a.attnum > 0
  and not a.attisdropped
  and a.attname ~* '(password|passwd|secret|token|api[_]?key|private[_]?key|access[_]?key|refresh[_]?token|credit[_]?card|ssn|iban|passport|code[_]?verifier|verification[_]?code)'
order by c.relname, a.attname;

-- 4) Policies that allow every row (USING true / WITH CHECK true)
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') in ('true', '(true)')
    or coalesce(with_check, '') in ('true', '(true)')
  )
order by tablename, policyname;

-- 5) Public tables that have RLS on but no policies
select
  n.nspname as schema,
  c.relname as table_name
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1
    from pg_catalog.pg_policy p
    where p.polrelid = c.oid
  )
order by c.relname;
