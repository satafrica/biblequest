-- BibleQuest: security hardening (Supabase advisor findings) and gameplay upgrades.
--
-- Security
--   * Role helpers move to a private schema that the Data API does not expose; the
--     public versions stay callable only from inside other server functions.
--   * Every policy now names its role (anon/authenticated) and wraps auth.uid() in a
--     sub-select so it is evaluated once per query instead of once per row.
--   * The answer-free question view no longer runs with its owner's rights. Players
--     never read it directly; counts come from a dedicated function.
--   * Foreign keys get covering indexes.
-- Gameplay
--   * questions.verse_text: the KJV passage, returned only after an answer is locked in.
--   * 'review' level: replays questions the player has missed and not yet answered correctly.
--   * get_player_stats(): daily streak, best streak, active days and review count.

-- ---------------------------------------------------------------------------
-- Private role helpers
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_role_name()
returns public.player_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'player'::public.player_role);
$$;
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select private.current_role_name() in ('editor', 'admin');
$$;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select private.current_role_name() = 'admin';
$$;
revoke execute on function private.current_role_name(), private.is_staff(), private.is_admin() from public, anon;
grant execute on function private.current_role_name(), private.is_staff(), private.is_admin() to authenticated;

-- The public helpers remain for use inside SECURITY DEFINER functions only.
revoke execute on function public.current_role_name(), public.is_staff(), public.is_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Policies: explicit roles, per-query auth.uid()
-- ---------------------------------------------------------------------------
drop policy if exists "admin read audit" on public.admin_audit_log;
create policy "admin read audit" on public.admin_audit_log for select to authenticated using ((select private.is_admin()));

drop policy if exists "read published chapters" on public.adventure_chapters;
create policy "read published chapters" on public.adventure_chapters for select to anon, authenticated using (status = 'published');
create policy "staff read chapters" on public.adventure_chapters for select to authenticated using ((select private.is_staff()));

drop policy if exists "read published adventures" on public.adventures;
create policy "read published adventures" on public.adventures for select to anon, authenticated using (status = 'published');
create policy "staff read adventures" on public.adventures for select to authenticated using ((select private.is_staff()));

drop policy if exists "read published assets" on public.question_assets;
create policy "read published assets" on public.question_assets for select to anon, authenticated using (review_status = 'published');
create policy "staff read assets" on public.question_assets for select to authenticated using ((select private.is_staff()));

drop policy if exists "read active items" on public.store_items;
create policy "read active items" on public.store_items for select to anon, authenticated using (active);
create policy "staff read items" on public.store_items for select to authenticated using ((select private.is_staff()));

drop policy if exists "staff read reviews" on public.content_reviews;
create policy "staff read reviews" on public.content_reviews for select to authenticated using ((select private.is_staff()));
drop policy if exists "staff read daily" on public.daily_challenges;
create policy "staff read daily" on public.daily_challenges for select to authenticated using ((select private.is_staff()));
drop policy if exists "staff read questions" on public.questions;
create policy "staff read questions" on public.questions for select to authenticated using ((select private.is_staff()));

drop policy if exists "own sessions" on public.game_sessions;
create policy "own sessions" on public.game_sessions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own transactions" on public.gem_transactions;
create policy "own transactions" on public.gem_transactions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own wallet" on public.gem_wallets;
create policy "own wallet" on public.gem_wallets for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "members read membership" on public.group_members;
create policy "members read membership" on public.group_members for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "members read groups" on public.groups;
create policy "members read groups" on public.groups for select to authenticated using (
  owner_id = (select auth.uid())
  or exists (select 1 from public.group_members m where m.group_id = groups.id and m.user_id = (select auth.uid())));
drop policy if exists "own item uses" on public.item_uses;
create policy "own item uses" on public.item_uses for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own achievements" on public.player_achievements;
create policy "own achievements" on public.player_achievements for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own inventory" on public.player_inventory;
create policy "own inventory" on public.player_inventory for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own progress" on public.player_progress;
create policy "own progress" on public.player_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own awards" on public.question_awards;
create policy "own awards" on public.question_awards for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own answers" on public.session_answers;
create policy "own answers" on public.session_answers for select to authenticated using (
  exists (select 1 from public.game_sessions s where s.id = session_answers.session_id and s.user_id = (select auth.uid())));

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or (select private.is_staff()));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "file report" on public.reports;
create policy "file report" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists "read own or staff reports" on public.reports;
create policy "read own or staff reports" on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or (select private.is_staff()));

do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage')
     and exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'staff upload illustrations') then
    execute 'drop policy "staff upload illustrations" on storage.objects';
    execute 'create policy "staff upload illustrations" on storage.objects for insert to authenticated with check (bucket_id = ''illustrations'' and (select private.is_staff()))';
    execute 'drop policy if exists "staff update illustrations" on storage.objects';
    execute 'create policy "staff update illustrations" on storage.objects for update to authenticated using (bucket_id = ''illustrations'' and (select private.is_staff()))';
  end if;
end $$;

-- story_sequences is not used by the app; keep it locked (RLS on, no policies) and say so.
comment on table public.story_sequences is 'Reserved. Row level security is on with no policies, so the Data API cannot read or write it.';

-- ---------------------------------------------------------------------------
-- Answer-free view: invoker rights, no direct API access
-- ---------------------------------------------------------------------------
alter view public.published_questions set (security_invoker = true);
revoke select on public.published_questions from anon, authenticated;

create or replace function public.published_question_counts()
returns table (game_mode text, difficulty smallint, n bigint)
language sql stable security definer set search_path = public as $$
  select q.game_mode, q.difficulty, count(*) from public.questions q
   where q.status = 'published' group by q.game_mode, q.difficulty;
$$;
revoke execute on function public.published_question_counts() from public;
grant execute on function public.published_question_counts() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Covering indexes for every foreign key in public that lacks one
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname,
           string_agg(quote_ident(a.attname), ', ' order by k.ord) as cols
      from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace and n.nspname = 'public'
      cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
     where c.contype = 'f'
       and not exists (
         select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)
     group by c.conrelid, c.conname
  loop
    execute format('create index if not exists %I on %s (%s)', left(r.conname, 55) || '_idx', r.tbl, r.cols);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Verse text shown after answering
-- ---------------------------------------------------------------------------
alter table public.questions add column if not exists verse_text text;

create or replace function public.submit_answer(p_session uuid, p_question text, p_choice int, p_clues_used int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.questions; v_correct boolean; v_points int; v_res jsonb;
begin
  select * into v_q from public.questions where id = p_question and status = 'published';
  if v_q.id is null then raise exception 'question_not_found'; end if;
  if v_q.game_mode = 'sequence' then raise exception 'use_submit_sequence'; end if;
  v_correct := (p_choice = v_q.correct_index);
  v_points := case when v_q.game_mode = 'whoami'
                   then greatest(20, 100 - 20 * (greatest(1, least(coalesce(p_clues_used, 1), 5)) - 1))
                   else 100 end;
  v_res := public._record_answer(p_session, p_question, v_correct, p_choice, v_points);
  return v_res || jsonb_build_object(
    'correct', v_correct, 'correct_index', v_q.correct_index, 'explanation', v_q.explanation,
    'reference', v_q.reference_label, 'translation', v_q.translation_id, 'verse_text', v_q.verse_text,
    'points', case when v_correct then v_points else 0 end);
end $$;

create or replace function public.submit_sequence(p_session uuid, p_question text, p_order jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.questions; v_correct boolean; v_res jsonb;
begin
  select * into v_q from public.questions where id = p_question and status = 'published' and game_mode = 'sequence';
  if v_q.id is null then raise exception 'question_not_found'; end if;
  v_correct := (p_order = v_q.options);
  v_res := public._record_answer(p_session, p_question, v_correct, -1, 100);
  return v_res || jsonb_build_object('correct', v_correct, 'correct_order', v_q.options,
    'explanation', v_q.explanation, 'reference', v_q.reference_label, 'verse_text', v_q.verse_text,
    'points', case when v_correct then 100 else 0 end);
end $$;

-- ---------------------------------------------------------------------------
-- Review my mistakes
-- ---------------------------------------------------------------------------
insert into public.game_modes (id, name, description, availability, sort_order)
values ('review', 'Review My Mistakes', 'Replay questions you missed until you get them right.', 'live', 14)
on conflict (id) do update set availability = excluded.availability, name = excluded.name, description = excluded.description;

-- Questions this player has answered wrongly and never answered correctly since.
create or replace function public._review_ids(p_user uuid, p_limit int)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(qid order by last_wrong desc), '{}') from (
    select a.question_id as qid, max(a.answered_at) as last_wrong
      from public.session_answers a
      join public.game_sessions s on s.id = a.session_id and s.user_id = p_user
      join public.questions q on q.id = a.question_id and q.status = 'published' and q.game_mode <> 'sequence'
     where not a.is_correct
       and not exists (
         select 1 from public.session_answers a2
           join public.game_sessions s2 on s2.id = a2.session_id and s2.user_id = p_user
          where a2.question_id = a.question_id and a2.is_correct and a2.answered_at > a.answered_at)
     group by a.question_id
     order by max(a.answered_at) desc
     limit p_limit) t;
$$;
revoke execute on function public._review_ids(uuid, int) from public, anon, authenticated;

-- start_session gains the 'review' level key; everything else is unchanged.
create or replace function public.start_session(p_level_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_parts text[] := string_to_array(p_level_key, ':');
  v_mode text; v_diff int := 1; v_set int; v_ids text[]; v_session uuid; v_date date;
  v_level_size constant int := 8;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  if v_parts[1] in ('picture', 'whoami', 'scripture', 'sequence') and array_length(v_parts, 1) = 3 then
    v_mode := v_parts[1]; v_diff := v_parts[2]::int; v_set := v_parts[3]::int;
    if v_diff not between 1 and 4 or v_set < 1 then raise exception 'invalid_level'; end if;
    select array_agg(id order by id) into v_ids from (
      select id from public.questions
       where status = 'published' and game_mode = v_mode and difficulty = v_diff
       order by id offset (v_set - 1) * v_level_size limit v_level_size) s;

  elsif v_parts[1] = 'adv' and array_length(v_parts, 1) = 2 then
    v_mode := 'adventure';
    select array_agg(qid order by ord) into v_ids
      from public.adventure_chapters c
      join public.adventures a on a.id = c.adventure_id and a.status = 'published',
           unnest(c.question_ids) with ordinality as u(qid, ord)
     where c.id = v_parts[2] and c.status = 'published'
       and exists (select 1 from public.questions q where q.id = u.qid and q.status = 'published');
    if exists (
      select 1 from public.adventure_chapters c
       join public.adventure_chapters prev on prev.adventure_id = c.adventure_id and prev.position = c.position - 1
       where c.id = v_parts[2]
         and not exists (select 1 from public.player_progress p where p.user_id = v_user and p.level_key = 'adv:' || prev.id and p.times_completed > 0)
    ) then raise exception 'chapter_locked'; end if;
    select min(q.difficulty) into v_diff from public.questions q where q.id = any(v_ids);

  elsif v_parts[1] = 'daily' and array_length(v_parts, 1) = 2 then
    v_mode := 'daily'; v_date := v_parts[2]::date;
    if v_date <> current_date then raise exception 'daily_expired'; end if;
    insert into public.daily_challenges (challenge_date, question_ids)
      select current_date, array_agg(id) from (
        select id from public.questions
         where status = 'published' and game_mode in ('picture', 'whoami', 'scripture')
         order by md5(id || current_date::text) limit 5) s
      having count(*) >= 3
      on conflict (challenge_date) do nothing;
    select question_ids into v_ids from public.daily_challenges where challenge_date = current_date;

  elsif v_parts[1] = 'arena' and array_length(v_parts, 1) = 2 then
    v_mode := 'arena'; v_diff := v_parts[2]::int;
    if v_diff not between 1 and 4 then raise exception 'invalid_level'; end if;
    if v_diff = 4 and not exists (select 1 from public.player_inventory where user_id = v_user and item_id = 'bonus_expert') then
      raise exception 'bonus_required';
    end if;
    select array_agg(id) into v_ids from (
      select id from public.questions
       where status = 'published' and game_mode in ('picture', 'whoami', 'scripture') and difficulty <= v_diff
       order by random() limit 10) s;

  elsif v_parts[1] = 'review' and array_length(v_parts, 1) = 1 then
    v_mode := 'review';
    v_ids := public._review_ids(v_user, v_level_size);
    if array_length(v_ids, 1) is null then raise exception 'nothing_to_review'; end if;
  else
    raise exception 'invalid_level';
  end if;

  if v_ids is null or array_length(v_ids, 1) is null then raise exception 'no_published_content'; end if;

  insert into public.game_sessions (user_id, game_mode, level_key, difficulty, question_ids)
  values (v_user, v_mode, p_level_key, greatest(1, least(4, coalesce(v_diff, 1))), v_ids)
  returning id into v_session;

  return jsonb_build_object(
    'session_id', v_session,
    'questions', (select jsonb_agg(to_jsonb(pq) order by array_position(v_ids, pq.id))
                    from public.published_questions pq where pq.id = any(v_ids))
  );
end $$;

-- ---------------------------------------------------------------------------
-- Streaks and activity
-- ---------------------------------------------------------------------------
-- A day counts when the player completes at least one round. Days are counted in the
-- player's own time zone (an IANA name such as 'America/New_York'); unknown names fall back to UTC.
create or replace function public.get_player_stats(p_tz text default 'UTC')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_tz text := 'UTC';
  v_today date; v_days date[]; v_streak int := 0; v_best int := 0; v_run int := 0; v_prev date; d date;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_tz is not null and exists (select 1 from pg_timezone_names where name = p_tz) then v_tz := p_tz; end if;
  v_today := (now() at time zone v_tz)::date;

  select coalesce(array_agg(day order by day), '{}') into v_days from (
    select distinct (completed_at at time zone v_tz)::date as day
      from public.game_sessions where user_id = v_user and status = 'completed' and completed_at is not null) t;

  foreach d in array v_days loop
    if v_prev is not null and d = v_prev + 1 then v_run := v_run + 1; else v_run := 1; end if;
    v_best := greatest(v_best, v_run); v_prev := d;
  end loop;
  -- the current streak stays alive until the end of today
  if v_prev is not null and v_prev >= v_today - 1 then v_streak := v_run; end if;

  return jsonb_build_object(
    'today', v_today, 'timezone', v_tz,
    'current_streak', v_streak, 'best_streak', v_best,
    'played_today', v_prev = v_today,
    'active_days', (select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from unnest(v_days) x where x > v_today - 84),
    'review_count', coalesce(array_length(public._review_ids(v_user, 50), 1), 0));
end $$;
revoke execute on function public.get_player_stats(text) from public, anon;
grant execute on function public.get_player_stats(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Delete my account
-- ---------------------------------------------------------------------------
-- Staff-authored records (questions created, reviews, audit entries, resolved reports)
-- keep their content but lose the link to a deleted person instead of blocking deletion.
do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname
      from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace and n.nspname = 'public'
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype = 'a'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references auth.users(id) on delete set null', r.tbl, r.conname, r.attname);
  end loop;
end $$;

-- Permanently deletes the signed-in player's account and everything linked to it
-- (profile, wallet, gem history, items, progress, answers, reports they filed).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = v_user;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
