-- Run in Supabase SQL Editor after schema.sql and security-fixes.sql.
-- Safe to re-run.

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete
  using (auth.uid() = reviewer_id);
