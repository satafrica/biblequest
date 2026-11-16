-- One SELECT policy per role on these tables (avoids multiple permissive policies).
-- Visitors see published/active rows; signed-in users also see everything if staff.

drop policy if exists "read published chapters" on public.adventure_chapters;
drop policy if exists "staff read chapters" on public.adventure_chapters;
create policy "read published chapters" on public.adventure_chapters for select to anon using (status = 'published');
create policy "signed-in read chapters" on public.adventure_chapters for select to authenticated using (status = 'published' or (select private.is_staff()));

drop policy if exists "read published adventures" on public.adventures;
drop policy if exists "staff read adventures" on public.adventures;
create policy "read published adventures" on public.adventures for select to anon using (status = 'published');
create policy "signed-in read adventures" on public.adventures for select to authenticated using (status = 'published' or (select private.is_staff()));

drop policy if exists "read published assets" on public.question_assets;
drop policy if exists "staff read assets" on public.question_assets;
create policy "read published assets" on public.question_assets for select to anon using (review_status = 'published');
create policy "signed-in read assets" on public.question_assets for select to authenticated using (review_status = 'published' or (select private.is_staff()));

drop policy if exists "read active items" on public.store_items;
drop policy if exists "staff read items" on public.store_items;
create policy "read active items" on public.store_items for select to anon using (active);
create policy "signed-in read items" on public.store_items for select to authenticated using (active or (select private.is_staff()));
