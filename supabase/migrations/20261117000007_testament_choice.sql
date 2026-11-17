-- Old Testament / New Testament / whole Bible choice.
-- Level keys may end in ':ot' or ':nt' (e.g. 'picture:1:2:ot', 'arena:3:nt').
-- Keys without a suffix keep meaning the whole Bible, so existing progress is unchanged.

-- Counts now include the testament so the app can show levels per part of the Bible.
drop function if exists public.published_question_counts();
create function public.published_question_counts()
returns table (game_mode text, difficulty smallint, testament text, n bigint)
language sql stable security definer set search_path = public as $$
  select q.game_mode, q.difficulty, b.testament, count(*)
    from public.questions q join public.bible_books b on b.id = q.book_id
   where q.status = 'published'
   group by q.game_mode, q.difficulty, b.testament;
$$;
revoke execute on function public.published_question_counts() from public;
grant execute on function public.published_question_counts() to anon, authenticated;

create or replace function public.start_session(p_level_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_parts text[] := string_to_array(p_level_key, ':');
  v_mode text; v_diff int := 1; v_set int; v_part text; v_ids text[]; v_session uuid; v_date date;
  v_level_size constant int := 8;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  if v_parts[1] in ('picture', 'whoami', 'scripture', 'sequence')
     and (array_length(v_parts, 1) = 3 or (array_length(v_parts, 1) = 4 and v_parts[4] in ('ot', 'nt'))) then
    v_mode := v_parts[1]; v_diff := v_parts[2]::int; v_set := v_parts[3]::int; v_part := upper(v_parts[4]);
    if v_diff not between 1 and 4 or v_set < 1 then raise exception 'invalid_level'; end if;
    select array_agg(id order by id) into v_ids from (
      select id from public.questions
       where status = 'published' and game_mode = v_mode and difficulty = v_diff
         and (v_part is null or book_id in (select b.id from public.bible_books b where b.testament = v_part))
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

  elsif v_parts[1] = 'arena'
     and (array_length(v_parts, 1) = 2 or (array_length(v_parts, 1) = 3 and v_parts[3] in ('ot', 'nt'))) then
    v_mode := 'arena'; v_diff := v_parts[2]::int; v_part := upper(v_parts[3]);
    if v_diff not between 1 and 4 then raise exception 'invalid_level'; end if;
    if v_diff = 4 and not exists (select 1 from public.player_inventory where user_id = v_user and item_id = 'bonus_expert') then
      raise exception 'bonus_required';
    end if;
    select array_agg(id) into v_ids from (
      select id from public.questions
       where status = 'published' and game_mode in ('picture', 'whoami', 'scripture') and difficulty <= v_diff
         and (v_part is null or book_id in (select b.id from public.bible_books b where b.testament = v_part))
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
revoke execute on function public.start_session(text) from public, anon;
grant execute on function public.start_session(text) to authenticated;

notify pgrst, 'reload schema';
