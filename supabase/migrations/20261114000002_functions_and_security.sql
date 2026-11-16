-- BibleQuest server-side logic and row-level security.
-- Every gem movement happens inside SECURITY DEFINER functions in a single
-- transaction. The browser can never write wallets, transactions, inventory,
-- sessions or progress directly.

-- Sequence questions: shuffled display order in the public view (correct order stays private)
create or replace view public.published_questions
with (security_barrier = true) as
  select q.id, q.game_mode, q.book_id, q.chapter, q.verse_start, q.verse_end,
         q.reference_label, q.difficulty, q.prompt, q.clues,
         case when q.game_mode = 'sequence'
              then (select jsonb_agg(e order by md5(q.id || e)) from jsonb_array_elements_text(q.options) e)
              else q.options end as options,
         q.hint is not null as has_hint,
         q.image_id, coalesce(q.image_alt, a.alt_text) as image_alt,
         a.storage_path as image_path, q.translation_id, q.tags
  from public.questions q
  left join public.question_assets a on a.id = q.image_id and a.review_status = 'published'
  where q.status = 'published';

alter table public.session_answers add column if not exists points int not null default 0;

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.player_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'player'::public.player_role);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_name() in ('editor', 'admin');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + empty wallet (works for anonymous guests too)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 40), ''), 'Pilgrim'))
  on conflict (id) do nothing;
  insert into public.gem_wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Core ledger primitive. Idempotent per (user, key). Locks the wallet row so
-- concurrent calls for the same user are serialised.
-- ---------------------------------------------------------------------------
create or replace function public._apply_gems(
  p_user uuid, p_amount int, p_reason text, p_ref_type text, p_ref_id text, p_key text
) returns table (applied int, balance bigint)
language plpgsql security definer set search_path = public as $$
declare v_balance bigint; v_new bigint;
begin
  if p_amount = 0 then
    select w.balance into v_balance from public.gem_wallets w where w.user_id = p_user;
    return query select 0, coalesce(v_balance, 0::bigint); return;
  end if;
  insert into public.gem_wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  select w.balance into v_balance from public.gem_wallets w where w.user_id = p_user for update;

  if exists (select 1 from public.gem_transactions t where t.user_id = p_user and t.idempotency_key = p_key) then
    return query select 0, v_balance; return;
  end if;

  v_new := v_balance + p_amount;
  if v_new < 0 then
    raise exception 'insufficient_gems' using errcode = 'P0001';
  end if;

  insert into public.gem_transactions (user_id, amount, kind, reason, ref_type, ref_id, idempotency_key, balance_after)
  values (p_user, p_amount, case when p_amount > 0 then 'earn' else 'spend' end, p_reason, p_ref_type, p_ref_id, p_key, v_new);

  update public.gem_wallets
     set balance = v_new,
         lifetime_earned = lifetime_earned + greatest(p_amount, 0),
         updated_at = now()
   where user_id = p_user;

  return query select p_amount, v_new;
end $$;

create or replace function public._rule(p_id text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select gems from public.reward_rules where id = p_id), 0);
$$;

-- ---------------------------------------------------------------------------
-- Sessions
-- level_key formats:
--   '<mode>:<difficulty>:<set>'  fixed level of 8 questions (picture, whoami, scripture, sequence)
--   'adv:<chapter_id>'           Bible Adventure Journey chapter
--   'daily:<yyyy-mm-dd>'         Daily Bible Challenge (server date only)
--   'arena:<difficulty>'         timed Challenge Arena, random draw of 10
-- ---------------------------------------------------------------------------
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
    -- chapters unlock in order
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
      having count(*) >= 3  -- nothing published yet: leave today unset so it can fill in later
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

create or replace function public._record_answer(
  p_session uuid, p_question text, p_correct boolean, p_choice int, p_points int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_s public.game_sessions; v_award int := 0; v_balance bigint; v_rows int;
begin
  select * into v_s from public.game_sessions where id = p_session for update;
  if v_s.id is null or v_s.user_id <> v_user then raise exception 'session_not_found'; end if;
  if v_s.status <> 'active' then raise exception 'session_closed'; end if;
  if not (p_question = any(v_s.question_ids)) then raise exception 'question_not_in_session'; end if;

  insert into public.session_answers (session_id, question_id, choice, is_correct, points)
  values (p_session, p_question, p_choice, p_correct, case when p_correct then p_points else 0 end)
  on conflict (session_id, question_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'already_answered'; end if;

  update public.game_sessions
     set answered_count = answered_count + 1,
         correct_count = correct_count + (case when p_correct then 1 else 0 end)
   where id = p_session;

  if p_correct then
    insert into public.question_awards (user_id, question_id) values (v_user, p_question)
      on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 1 then
      select applied, balance into v_award, v_balance
        from public._apply_gems(v_user, public._rule('correct_answer'), 'Correct answer', 'question', p_question, 'q:' || p_question);
    end if;
  end if;
  if v_balance is null then select balance into v_balance from public.gem_wallets where user_id = v_user; end if;
  return jsonb_build_object('gems_awarded', v_award, 'balance', coalesce(v_balance, 0),
                            'first_time_award', v_award > 0);
end $$;

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
    'reference', v_q.reference_label, 'translation', v_q.translation_id,
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
    'explanation', v_q.explanation, 'reference', v_q.reference_label, 'points', case when v_correct then 100 else 0 end);
end $$;

create or replace function public._check_achievements(p_user uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_new text[] := '{}'; r record; v_val bigint; v_id text;
begin
  for r in select * from public.achievements loop
    continue when exists (select 1 from public.player_achievements where user_id = p_user and achievement_id = r.id);
    v_val := case r.rule->>'type'
      when 'correct_total' then (select count(*) from public.question_awards where user_id = p_user)
      when 'levels_completed' then (select count(*) from public.player_progress where user_id = p_user and times_completed > 0)
      when 'perfect_levels' then (select count(*) from public.gem_transactions where user_id = p_user and idempotency_key like 'perfect:%')
      when 'daily_total' then (select count(*) from public.gem_transactions where user_id = p_user and idempotency_key like 'daily:%')
      when 'adventures_completed' then (select count(*) from public.gem_transactions where user_id = p_user and idempotency_key like 'adventure:%')
      when 'mode_levels' then (select count(*) from public.player_progress where user_id = p_user and game_mode = r.rule->>'mode' and times_completed > 0)
      else 0 end;
    if v_val >= (r.rule->>'gte')::bigint then
      insert into public.player_achievements (user_id, achievement_id) values (p_user, r.id) on conflict do nothing
      returning achievement_id into v_id;
      if v_id is not null then v_new := v_new || v_id; end if;
    end if;
  end loop;
  return v_new;
end $$;

create or replace function public.complete_session(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_s public.game_sessions; v_total int; v_bonus jsonb := '[]'::jsonb;
  v_applied int; v_balance bigint; v_adv text; v_parts text[];
begin
  select * into v_s from public.game_sessions where id = p_session for update;
  if v_s.id is null or v_s.user_id <> v_user then raise exception 'session_not_found'; end if;
  if v_s.status = 'completed' then raise exception 'session_closed'; end if;
  v_total := array_length(v_s.question_ids, 1);
  if v_s.answered_count < v_total then raise exception 'session_incomplete'; end if;

  update public.game_sessions set status = 'completed', completed_at = now() where id = p_session;

  insert into public.player_progress (user_id, level_key, game_mode, best_correct, total_questions, times_completed, last_played_at)
  values (v_user, v_s.level_key, v_s.game_mode, v_s.correct_count, v_total, 1, now())
  on conflict (user_id, level_key) do update
    set best_correct = greatest(public.player_progress.best_correct, excluded.best_correct),
        total_questions = excluded.total_questions,
        times_completed = public.player_progress.times_completed + 1,
        last_played_at = now();

  v_parts := string_to_array(v_s.level_key, ':');

  if v_s.game_mode in ('picture', 'whoami', 'scripture', 'sequence', 'adventure') then
    select applied into v_applied from public._apply_gems(v_user, public._rule('level_complete'), 'Level completed', 'level', v_s.level_key, 'level:' || v_s.level_key);
    if v_applied > 0 then v_bonus := v_bonus || jsonb_build_object('reason', 'Level completed', 'gems', v_applied); end if;
    if v_s.correct_count = v_total then
      select applied into v_applied from public._apply_gems(v_user, public._rule('perfect_round'), 'Perfect round', 'level', v_s.level_key, 'perfect:' || v_s.level_key);
      if v_applied > 0 then v_bonus := v_bonus || jsonb_build_object('reason', 'Perfect round', 'gems', v_applied); end if;
    end if;
  end if;

  if v_s.game_mode = 'daily' and v_parts[2]::date = (v_s.started_at at time zone 'UTC')::date then
    select applied into v_applied from public._apply_gems(v_user, public._rule('daily_challenge'), 'Daily challenge', 'daily', v_parts[2], 'daily:' || v_parts[2]);
    if v_applied > 0 then v_bonus := v_bonus || jsonb_build_object('reason', 'Daily challenge', 'gems', v_applied); end if;
  end if;

  if v_s.game_mode = 'adventure' then
    select c.adventure_id into v_adv from public.adventure_chapters c where c.id = v_parts[2];
    if v_adv is not null and not exists (
      select 1 from public.adventure_chapters c
       where c.adventure_id = v_adv and c.status = 'published'
         and not exists (select 1 from public.player_progress p where p.user_id = v_user and p.level_key = 'adv:' || c.id and p.times_completed > 0)
    ) then
      select applied into v_applied from public._apply_gems(v_user, public._rule('adventure_complete'), 'Adventure completed', 'adventure', v_adv, 'adventure:' || v_adv);
      if v_applied > 0 then v_bonus := v_bonus || jsonb_build_object('reason', 'Adventure completed', 'gems', v_applied); end if;
    end if;
  end if;

  select balance into v_balance from public.gem_wallets where user_id = v_user;
  return jsonb_build_object('correct', v_s.correct_count, 'total', v_total, 'bonuses', v_bonus,
    'balance', coalesce(v_balance, 0), 'new_achievements', to_jsonb(public._check_achievements(v_user)));
end $$;

-- ---------------------------------------------------------------------------
-- Store
-- ---------------------------------------------------------------------------
create or replace function public.purchase_item(p_item text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_item public.store_items; v_applied int; v_balance bigint; v_qty int;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 then raise exception 'invalid_idempotency_key'; end if;
  select * into v_item from public.store_items where id = p_item and active;
  if v_item.id is null then raise exception 'item_not_found'; end if;

  -- serialise all purchases for this user
  insert into public.gem_wallets (user_id) values (v_user) on conflict (user_id) do nothing;
  perform 1 from public.gem_wallets where user_id = v_user for update;

  -- replay of the same purchase request: return the original outcome, no second charge
  if exists (select 1 from public.gem_transactions where user_id = v_user and idempotency_key = 'buy:' || p_idempotency_key) then
    select balance into v_balance from public.gem_wallets where user_id = v_user;
    select quantity into v_qty from public.player_inventory where user_id = v_user and item_id = p_item;
    return jsonb_build_object('ok', true, 'replayed', true, 'balance', v_balance, 'quantity', coalesce(v_qty, 0));
  end if;

  if not v_item.consumable and exists (select 1 from public.player_inventory where user_id = v_user and item_id = p_item) then
    raise exception 'already_owned';
  end if;

  select applied, balance into v_applied, v_balance
    from public._apply_gems(v_user, -v_item.price, 'Purchased ' || v_item.name, 'store_item', p_item, 'buy:' || p_idempotency_key);

  insert into public.player_inventory (user_id, item_id, quantity) values (v_user, p_item, 1)
  on conflict (user_id, item_id) do update set quantity = public.player_inventory.quantity + 1
  returning quantity into v_qty;

  return jsonb_build_object('ok', true, 'replayed', false, 'balance', v_balance, 'quantity', v_qty);
end $$;

create or replace function public.use_power_up(p_session uuid, p_question text, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_s public.game_sessions; v_q public.questions; v_rows int; v_wrong int[];
begin
  if p_item not in ('hint', 'eliminate_two', 'extra_time') then raise exception 'not_a_power_up'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null or v_s.user_id <> v_user or v_s.status <> 'active' then raise exception 'session_not_found'; end if;
  if not (p_question = any(v_s.question_ids)) then raise exception 'question_not_in_session'; end if;
  if exists (select 1 from public.session_answers where session_id = p_session and question_id = p_question) then
    raise exception 'already_answered';
  end if;
  select * into v_q from public.questions where id = p_question;

  insert into public.item_uses (user_id, session_id, question_id, item_id) values (v_user, p_session, p_question, p_item)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    update public.player_inventory set quantity = quantity - 1
     where user_id = v_user and item_id = p_item and quantity > 0;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then raise exception 'none_owned'; end if;   -- rolls back the item_uses row too
  end if;

  if p_item = 'hint' then
    return jsonb_build_object('item', p_item, 'hint', coalesce(v_q.hint, 'Look closely at ' || v_q.reference_label || '.'));
  elsif p_item = 'eliminate_two' then
    select array_agg(i order by md5(v_q.id || i::text)) into v_wrong
      from generate_series(0, jsonb_array_length(v_q.options) - 1) i where i <> v_q.correct_index;
    return jsonb_build_object('item', p_item, 'eliminated', to_jsonb(v_wrong[1:2]));
  else
    return jsonb_build_object('item', p_item, 'extra_seconds', 15);
  end if;
end $$;

create or replace function public.set_item_equipped(p_item text, p_equipped boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_cat text;
begin
  select category into v_cat from public.store_items where id = p_item;
  if not exists (select 1 from public.player_inventory where user_id = auth.uid() and item_id = p_item and quantity > 0) then
    raise exception 'not_owned';
  end if;
  if p_equipped then  -- one equipped item per cosmetic category
    update public.player_inventory i set equipped = false
      from public.store_items s where s.id = i.item_id and s.category = v_cat and i.user_id = auth.uid();
  end if;
  update public.player_inventory set equipped = p_equipped where user_id = auth.uid() and item_id = p_item;
end $$;

create or replace function public.get_leaderboard(p_period text)
returns table (display_name text, correct bigint, rounds bigint)
language sql stable security definer set search_path = public as $$
  select p.display_name, sum(s.correct_count)::bigint, count(*)::bigint
    from public.game_sessions s join public.profiles p on p.id = s.user_id
   where s.status = 'completed' and s.game_mode = 'arena' and p.leaderboard_opt_in
     and s.completed_at >= case p_period when 'daily' then date_trunc('day', now()) else date_trunc('week', now()) end
   group by p.id, p.display_name
   order by 2 desc, 3 asc
   limit 50;
$$;

-- ---------------------------------------------------------------------------
-- Admin / editorial
-- ---------------------------------------------------------------------------
create or replace function public._audit(p_action text, p_type text, p_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_type, p_id, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.admin_set_question_status(p_id text, p_status public.content_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_from public.content_status;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select status into v_from from public.questions where id = p_id for update;
  if v_from is null then raise exception 'question_not_found'; end if;
  -- editorial workflow: draft -> review -> approved -> published (admins only publish)
  if not (
       (p_status = 'review' and v_from in ('draft', 'rejected'))
    or (p_status in ('approved', 'rejected') and v_from = 'review')
    or (p_status = 'published' and v_from = 'approved' and public.is_admin())
    or (p_status = 'archived' and v_from = 'published' and public.is_admin())
    or (p_status = 'draft')
  ) then raise exception 'invalid_transition % -> %', v_from, p_status; end if;
  update public.questions set status = p_status, updated_at = now() where id = p_id;
  insert into public.content_reviews (content_type, content_id, reviewer_id, from_status, to_status, note)
  values ('question', p_id, auth.uid(), v_from, p_status, p_note);
  perform public._audit('question.status', 'question', p_id, jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));
end $$;

create or replace function public.admin_upsert_question(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text := coalesce(p->>'id', 'q-' || substr(md5(random()::text), 1, 10));
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.questions (id, game_mode, book_id, chapter, verse_start, verse_end, reference_label, difficulty,
    prompt, clues, options, correct_index, explanation, hint, image_id, image_alt, translation_id, tags, status, created_by)
  values (v_id, p->>'game_mode', (p->>'book_id')::smallint, (p->>'chapter')::smallint, (p->>'verse_start')::smallint,
    coalesce((p->>'verse_end')::smallint, (p->>'verse_start')::smallint), p->>'reference_label', (p->>'difficulty')::smallint,
    p->>'prompt', p->'clues', p->'options', (p->>'correct_index')::smallint, p->>'explanation', p->>'hint',
    nullif(p->>'image_id', ''), p->>'image_alt', coalesce(p->>'translation_id', 'KJV'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(p->'tags') x), '{}'), 'draft', auth.uid())
  on conflict (id) do update set
    game_mode = excluded.game_mode, book_id = excluded.book_id, chapter = excluded.chapter,
    verse_start = excluded.verse_start, verse_end = excluded.verse_end, reference_label = excluded.reference_label,
    difficulty = excluded.difficulty, prompt = excluded.prompt, clues = excluded.clues, options = excluded.options,
    correct_index = excluded.correct_index, explanation = excluded.explanation, hint = excluded.hint,
    image_id = excluded.image_id, image_alt = excluded.image_alt, translation_id = excluded.translation_id,
    tags = excluded.tags, status = 'draft', updated_at = now();   -- any edit sends content back to draft
  perform public._audit('question.upsert', 'question', v_id, p);
  return v_id;
end $$;

create or replace function public.admin_update_store_item(p_id text, p_price int, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_price <= 0 then raise exception 'invalid_price'; end if;
  update public.store_items set price = p_price, active = p_active where id = p_id;
  if not found then raise exception 'item_not_found'; end if;
  perform public._audit('store.update', 'store_item', p_id, jsonb_build_object('price', p_price, 'active', p_active));
end $$;

create or replace function public.admin_update_reward_rule(p_id text, p_gems int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_gems < 0 or p_gems > 1000 then raise exception 'invalid_amount'; end if;
  update public.reward_rules set gems = p_gems where id = p_id;
  if not found then raise exception 'rule_not_found'; end if;
  perform public._audit('reward_rule.update', 'reward_rule', p_id, jsonb_build_object('gems', p_gems));
end $$;

create or replace function public.admin_set_report_status(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.reports set status = p_status,
    resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
   where id = p_id;
  perform public._audit('report.status', 'report', p_id::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'sessions_7d', (select count(*) from public.game_sessions where started_at > now() - interval '7 days'),
    'completed_7d', (select count(*) from public.game_sessions where completed_at > now() - interval '7 days'),
    'answers_7d', (select count(*) from public.session_answers where answered_at > now() - interval '7 days'),
    'accuracy_7d', (select round(avg(case when is_correct then 1.0 else 0 end) * 100, 1) from public.session_answers where answered_at > now() - interval '7 days'),
    'gems_earned_7d', (select coalesce(sum(amount), 0) from public.gem_transactions where amount > 0 and created_at > now() - interval '7 days'),
    'gems_spent_7d', (select coalesce(-sum(amount), 0) from public.gem_transactions where amount < 0 and created_at > now() - interval '7 days'),
    'questions_by_status', (select jsonb_object_agg(status, n) from (select status, count(*) n from public.questions group by status) s),
    'open_reports', (select count(*) from public.reports where status = 'open'));
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['profiles','bible_translations','bible_books','scripture_references','game_modes',
    'question_assets','questions','adventures','adventure_chapters','game_sessions','session_answers',
    'player_progress','question_awards','daily_challenges','gem_wallets','gem_transactions','reward_rules',
    'store_items','player_inventory','item_uses','achievements','player_achievements','groups','group_members',
    'reports','content_reviews','admin_audit_log','story_sequences']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- public reference data (read-only)
create policy "read translations" on public.bible_translations for select using (true);
create policy "read books" on public.bible_books for select using (true);
create policy "read refs" on public.scripture_references for select using (true);
create policy "read modes" on public.game_modes for select using (true);
create policy "read rules" on public.reward_rules for select using (true);
create policy "read achievements" on public.achievements for select using (true);
create policy "read active items" on public.store_items for select using (active or public.is_staff());
create policy "read published assets" on public.question_assets for select using (review_status = 'published' or public.is_staff());
create policy "read published adventures" on public.adventures for select using (status = 'published' or public.is_staff());
create policy "read published chapters" on public.adventure_chapters for select using (status = 'published' or public.is_staff());

-- questions: staff only (players use published_questions view + RPCs)
create policy "staff read questions" on public.questions for select using (public.is_staff());

-- player-owned rows: read own only, writes only through functions
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own sessions" on public.game_sessions for select using (user_id = auth.uid());
create policy "own answers" on public.session_answers for select using (exists (select 1 from public.game_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own progress" on public.player_progress for select using (user_id = auth.uid());
create policy "own awards" on public.question_awards for select using (user_id = auth.uid());
create policy "own wallet" on public.gem_wallets for select using (user_id = auth.uid());
create policy "own transactions" on public.gem_transactions for select using (user_id = auth.uid());
create policy "own inventory" on public.player_inventory for select using (user_id = auth.uid());
create policy "own item uses" on public.item_uses for select using (user_id = auth.uid());
create policy "own achievements" on public.player_achievements for select using (user_id = auth.uid());

-- community (prepared; UI disabled)
create policy "members read groups" on public.groups for select using (
  owner_id = auth.uid() or exists (select 1 from public.group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy "members read membership" on public.group_members for select using (user_id = auth.uid());

-- reports
create policy "file report" on public.reports for insert with check (reporter_id = auth.uid());
create policy "read own or staff reports" on public.reports for select using (reporter_id = auth.uid() or public.is_staff());

-- editorial logs
create policy "staff read reviews" on public.content_reviews for select using (public.is_staff());
create policy "admin read audit" on public.admin_audit_log for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants. Players may only change these profile columns themselves.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_id, preferences, leaderboard_opt_in, updated_at) on public.profiles to authenticated;
revoke insert, update, delete on public.gem_wallets, public.gem_transactions, public.player_inventory,
  public.game_sessions, public.session_answers, public.player_progress, public.question_awards,
  public.questions, public.store_items, public.reward_rules, public.player_achievements, public.item_uses,
  public.daily_challenges, public.content_reviews, public.admin_audit_log from anon, authenticated;
grant select on public.published_questions to anon, authenticated;

revoke execute on function public._apply_gems(uuid, int, text, text, text, text) from public, anon, authenticated;
revoke execute on function public._record_answer(uuid, text, boolean, int, int) from public, anon, authenticated;
revoke execute on function public._check_achievements(uuid) from public, anon, authenticated;
revoke execute on function public._audit(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public._rule(text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.start_session(text), public.submit_answer(uuid, text, int, int),
  public.submit_sequence(uuid, text, jsonb), public.complete_session(uuid), public.purchase_item(text, text),
  public.use_power_up(uuid, text, text), public.set_item_equipped(text, boolean),
  public.admin_set_question_status(text, public.content_status, text), public.admin_upsert_question(jsonb),
  public.admin_update_store_item(text, int, boolean), public.admin_update_reward_rule(text, int),
  public.admin_set_report_status(bigint, text), public.admin_stats() from public, anon;
grant execute on function public.start_session(text), public.submit_answer(uuid, text, int, int),
  public.submit_sequence(uuid, text, jsonb), public.complete_session(uuid), public.purchase_item(text, text),
  public.use_power_up(uuid, text, text), public.set_item_equipped(text, boolean),
  public.admin_set_question_status(text, public.content_status, text), public.admin_upsert_question(jsonb),
  public.admin_update_store_item(text, int, boolean), public.admin_update_reward_rule(text, int),
  public.admin_set_report_status(bigint, text), public.admin_stats() to authenticated;
grant execute on function public.get_leaderboard(text) to anon, authenticated;
