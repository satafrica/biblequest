-- Admin content tools: illustration uploads, adventure chapter editing, scheduled daily
-- challenges, and a structural reference check for every question.

-- Every question must point at a chapter that exists in its book.
create or replace function public._check_question_reference()
returns trigger language plpgsql set search_path = public as $$
declare v_chapters smallint;
begin
  select chapter_count into v_chapters from public.bible_books where id = new.book_id;
  if v_chapters is null or new.chapter > v_chapters then
    raise exception 'invalid_reference: % has % chapters', new.book_id, v_chapters;
  end if;
  return new;
end $$;
drop trigger if exists questions_reference_check on public.questions;
create trigger questions_reference_check before insert or update of book_id, chapter on public.questions
  for each row execute function public._check_question_reference();

-- Illustration metadata. New or edited assets go back to draft and must be reviewed.
create or replace function public.admin_upsert_asset(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text := nullif(p->>'id', '');
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_id is null or v_id !~ '^[a-z0-9_\-]{3,60}$' then raise exception 'invalid_id'; end if;
  if coalesce(trim(p->>'alt_text'), '') = '' then raise exception 'alt_text_required'; end if;
  if coalesce(trim(p->>'license'), '') = '' or coalesce(trim(p->>'ownership'), '') = '' then raise exception 'licensing_required'; end if;
  insert into public.question_assets (id, description, bible_reference, generation_prompt, ownership, license,
    is_artistic_interpretation, interpretation_note, alt_text, storage_path, width, height, review_status)
  values (v_id, p->>'description', p->>'bible_reference', p->>'generation_prompt', p->>'ownership', p->>'license',
    coalesce((p->>'is_artistic_interpretation')::boolean, true), p->>'interpretation_note', p->>'alt_text',
    p->>'storage_path', (p->>'width')::int, (p->>'height')::int, 'draft')
  on conflict (id) do update set description = excluded.description, bible_reference = excluded.bible_reference,
    generation_prompt = excluded.generation_prompt, ownership = excluded.ownership, license = excluded.license,
    is_artistic_interpretation = excluded.is_artistic_interpretation, interpretation_note = excluded.interpretation_note,
    alt_text = excluded.alt_text, storage_path = excluded.storage_path, width = excluded.width, height = excluded.height,
    review_status = 'draft';
  perform public._audit('asset.upsert', 'asset', v_id, p - 'generation_prompt');
  return v_id;
end $$;

-- Adventure chapter text and question list. Edits return the chapter to draft.
create or replace function public.admin_upsert_chapter(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text := p->>'id'; v_ids text[];
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select array_agg(x) into v_ids from jsonb_array_elements_text(p->'question_ids') x;
  if v_ids is null or array_length(v_ids, 1) < 1 then raise exception 'questions_required'; end if;
  if exists (select 1 from unnest(v_ids) q where not exists (select 1 from public.questions where id = q)) then
    raise exception 'unknown_question';
  end if;
  insert into public.adventure_chapters (id, adventure_id, position, title, reference_label, narrative, image_id, question_ids, status)
  values (v_id, p->>'adventure_id', (p->>'position')::smallint, p->>'title', p->>'reference_label', p->>'narrative',
          nullif(p->>'image_id', ''), v_ids, 'draft')
  on conflict (id) do update set title = excluded.title, reference_label = excluded.reference_label,
    narrative = excluded.narrative, image_id = excluded.image_id, question_ids = excluded.question_ids, status = 'draft';
  perform public._audit('chapter.upsert', 'chapter', v_id, p);
  return v_id;
end $$;

-- Schedule a hand-picked daily challenge (admins). Only published questions; today or later;
-- a day that players have already started cannot be changed.
create or replace function public.admin_set_daily(p_date date, p_ids text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_date < current_date then raise exception 'date_in_past'; end if;
  if array_length(p_ids, 1) is null or array_length(p_ids, 1) not between 3 and 10 then raise exception 'invalid_count'; end if;
  if exists (select 1 from unnest(p_ids) q where not exists (select 1 from public.questions where id = q and status = 'published')) then
    raise exception 'unpublished_question';
  end if;
  if exists (select 1 from public.game_sessions where level_key = 'daily:' || p_date::text) then
    raise exception 'daily_already_started';
  end if;
  insert into public.daily_challenges (challenge_date, question_ids) values (p_date, p_ids)
  on conflict (challenge_date) do update set question_ids = excluded.question_ids;
  perform public._audit('daily.set', 'daily', p_date::text, jsonb_build_object('ids', p_ids));
end $$;

revoke execute on function public.admin_upsert_asset(jsonb), public.admin_upsert_chapter(jsonb), public.admin_set_daily(date, text[]) from public, anon;
grant execute on function public.admin_upsert_asset(jsonb), public.admin_upsert_chapter(jsonb), public.admin_set_daily(date, text[]) to authenticated;
revoke execute on function public._check_question_reference() from public, anon, authenticated;

-- Staff read daily schedule
drop policy if exists "staff read daily" on public.daily_challenges;
create policy "staff read daily" on public.daily_challenges for select using (public.is_staff());
grant select on public.daily_challenges to authenticated;

-- Supabase Storage bucket for illustrations (skipped automatically where Storage is absent,
-- e.g. the local test database). Public read; only staff may upload or replace files.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('illustrations', 'illustrations', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
    on conflict (id) do nothing;
    execute 'drop policy if exists "staff upload illustrations" on storage.objects';
    execute 'create policy "staff upload illustrations" on storage.objects for insert to authenticated with check (bucket_id = ''illustrations'' and public.is_staff())';
    execute 'drop policy if exists "staff update illustrations" on storage.objects';
    execute 'create policy "staff update illustrations" on storage.objects for update to authenticated using (bucket_id = ''illustrations'' and public.is_staff())';
  end if;
end $$;
