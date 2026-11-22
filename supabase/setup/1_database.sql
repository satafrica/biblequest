-- MyBibleGem database setup, part 1 of 2: tables, security rules and game functions.
-- Paste all of this into Supabase -> SQL Editor -> New query, then press Run.
-- Safe to run on a new, empty project. Generated from supabase/migrations/.
begin;

-- ===== 20261114000001_core_schema.sql =====
-- BibleQuest core schema
-- Target: Supabase (PostgreSQL 15+). Relies on Supabase's built-in `auth` schema,
-- `auth.uid()`, and the `anon` / `authenticated` / `service_role` roles.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.content_status as enum ('draft', 'review', 'approved', 'published', 'rejected', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.player_role as enum ('player', 'editor', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Pilgrim' check (char_length(display_name) between 1 and 40),
  avatar_id text not null default 'scroll',
  role public.player_role not null default 'player',
  preferences jsonb not null default '{}'::jsonb,
  leaderboard_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bible reference data
-- ---------------------------------------------------------------------------
create table if not exists public.bible_translations (
  id text primary key,                 -- e.g. 'KJV'
  name text not null,
  language_code text not null default 'en',
  license text not null,               -- e.g. 'Public domain (outside the UK)'
  license_notes text,
  permission_status text not null check (permission_status in ('public_domain', 'licensed', 'pending', 'not_permitted')),
  source_url text
);

create table if not exists public.bible_books (
  id smallint primary key check (id between 1 and 66),
  name text not null unique,
  testament text not null check (testament in ('OT', 'NT')),
  chapter_count smallint not null check (chapter_count > 0)
);

create table if not exists public.scripture_references (
  id bigint generated always as identity primary key,
  book_id smallint not null references public.bible_books(id),
  chapter smallint not null check (chapter > 0),
  verse_start smallint not null check (verse_start > 0),
  verse_end smallint not null check (verse_end >= verse_start),
  translation_id text not null references public.bible_translations(id),
  passage_text text,
  unique (book_id, chapter, verse_start, verse_end, translation_id)
);

-- ---------------------------------------------------------------------------
-- Game catalogue and content
-- ---------------------------------------------------------------------------
create table if not exists public.game_modes (
  id text primary key,
  name text not null,
  description text not null,
  availability text not null default 'in_development' check (availability in ('live', 'in_development')),
  sort_order smallint not null default 0
);

create table if not exists public.question_assets (
  id text primary key,
  description text not null,
  bible_reference text,
  generation_prompt text,
  ownership text not null,
  license text not null,
  is_artistic_interpretation boolean not null default true,
  interpretation_note text,
  alt_text text not null check (char_length(alt_text) > 0),
  storage_path text not null,
  width int, height int,
  review_status public.content_status not null default 'review',
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  game_mode text not null references public.game_modes(id),
  book_id smallint not null references public.bible_books(id),
  chapter smallint not null check (chapter > 0),
  verse_start smallint not null check (verse_start > 0),
  verse_end smallint not null,
  reference_label text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  prompt text not null,
  clues jsonb,                          -- Who Am I clues (array of strings)
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index smallint not null,
  explanation text not null,
  hint text,
  image_id text references public.question_assets(id),
  image_alt text,
  translation_id text not null references public.bible_translations(id),
  tags text[] not null default '{}',
  status public.content_status not null default 'draft',
  verification jsonb not null default '{}'::jsonb,  -- automated reference check output
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verse_end >= verse_start),
  check (correct_index >= 0 and correct_index < jsonb_array_length(options))
);
create index if not exists questions_mode_status_diff_idx on public.questions (game_mode, status, difficulty);
create index if not exists questions_tags_idx on public.questions using gin (tags);

create table if not exists public.story_sequences (
  id text primary key,
  title text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  events jsonb not null,               -- ordered array of {text, reference}
  reference_label text not null,
  explanation text not null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.adventures (
  id text primary key,
  title text not null,
  summary text not null,
  testament text not null check (testament in ('OT', 'NT', 'ALL')),
  image_id text references public.question_assets(id),
  sort_order smallint not null default 0,
  status public.content_status not null default 'draft'
);

create table if not exists public.adventure_chapters (
  id text primary key,
  adventure_id text not null references public.adventures(id) on delete cascade,
  position smallint not null,
  title text not null,
  reference_label text not null,
  narrative text not null,
  image_id text references public.question_assets(id),
  question_ids text[] not null,
  status public.content_status not null default 'draft',
  unique (adventure_id, position)
);

-- ---------------------------------------------------------------------------
-- Gameplay
-- ---------------------------------------------------------------------------
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_mode text not null references public.game_modes(id),
  level_key text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  question_ids text[] not null,
  answered_count int not null default 0,
  correct_count int not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists game_sessions_user_idx on public.game_sessions (user_id, started_at desc);
create index if not exists game_sessions_mode_completed_idx on public.game_sessions (game_mode, completed_at) where status = 'completed';

create table if not exists public.session_answers (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id text not null references public.questions(id),
  choice smallint not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id)
);

create table if not exists public.player_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  level_key text not null,
  game_mode text not null references public.game_modes(id),
  best_correct int not null default 0,
  total_questions int not null default 0,
  times_completed int not null default 0,
  last_played_at timestamptz not null default now(),
  primary key (user_id, level_key)
);

-- One row per (user, question) the first time it was answered correctly; this
-- is what makes per-question gems impossible to farm.
create table if not exists public.question_awards (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references public.questions(id),
  awarded_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.daily_challenges (
  challenge_date date primary key,
  question_ids text[] not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Gems
-- ---------------------------------------------------------------------------
create table if not exists public.gem_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.gem_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null check (amount <> 0),
  kind text not null check (kind in ('earn', 'spend', 'admin_adjust')),
  reason text not null,
  ref_type text,
  ref_id text,
  idempotency_key text not null,
  balance_after bigint not null check (balance_after >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists gem_transactions_user_idx on public.gem_transactions (user_id, created_at desc);

create table if not exists public.reward_rules (
  id text primary key,                   -- 'correct_answer', 'level_complete', ...
  gems int not null check (gems >= 0),
  description text not null
);

create table if not exists public.store_items (
  id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('power_up', 'badge', 'frame', 'theme', 'collection', 'collectible', 'bonus', 'decoration')),
  price int not null check (price > 0),
  consumable boolean not null default false,
  image_path text,
  image_alt text,
  active boolean not null default true,
  sort_order smallint not null default 0
);

create table if not exists public.player_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.store_items(id),
  quantity int not null default 1 check (quantity >= 0),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.item_uses (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id text not null,
  item_id text not null references public.store_items(id),
  used_at timestamptz not null default now(),
  primary key (user_id, session_id, question_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null default 'star',
  rule jsonb not null                   -- e.g. {"type":"correct_total","gte":50}
);

create table if not exists public.player_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- Community (schema prepared; UI feature-flagged off until moderated release)
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  privacy text not null default 'private' check (privacy in ('private', 'invite_only')),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('question', 'profile', 'group', 'image')),
  target_id text not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Editorial + audit
-- ---------------------------------------------------------------------------
create table if not exists public.content_reviews (
  id bigint generated always as identity primary key,
  content_type text not null check (content_type in ('question', 'asset', 'sequence', 'adventure', 'chapter')),
  content_id text not null,
  reviewer_id uuid references auth.users(id),
  from_status public.content_status,
  to_status public.content_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists content_reviews_content_idx on public.content_reviews (content_type, content_id);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Public, answer-free view of published questions.
-- (The base table is not readable by players, so correct answers never leave
-- the database before a player commits to an answer.)
-- ---------------------------------------------------------------------------
create or replace view public.published_questions
with (security_barrier = true) as
  select q.id, q.game_mode, q.book_id, q.chapter, q.verse_start, q.verse_end,
         q.reference_label, q.difficulty, q.prompt, q.clues, q.options,
         q.hint is not null as has_hint,
         q.image_id, coalesce(q.image_alt, a.alt_text) as image_alt,
         a.storage_path as image_path, q.translation_id, q.tags
  from public.questions q
  left join public.question_assets a on a.id = q.image_id and a.review_status = 'published'
  where q.status = 'published';

-- ===== 20261114000002_functions_and_security.sql =====
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

-- ===== 20261114000003_editorial_content_status.sql =====
-- Editorial workflow for images, adventures and adventure chapters (questions use
-- admin_set_question_status). Same rule: draft -> review -> approved -> published.
create or replace function public.admin_set_content_status(
  p_type text, p_id text, p_status public.content_status, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_from public.content_status;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_type = 'asset' then select review_status into v_from from public.question_assets where id = p_id for update;
  elsif p_type = 'adventure' then select status into v_from from public.adventures where id = p_id for update;
  elsif p_type = 'chapter' then select status into v_from from public.adventure_chapters where id = p_id for update;
  else raise exception 'invalid_type'; end if;
  if v_from is null then raise exception 'not_found'; end if;
  if not (
       (p_status = 'review' and v_from in ('draft', 'rejected'))
    or (p_status in ('approved', 'rejected') and v_from = 'review')
    or (p_status = 'published' and v_from = 'approved' and public.is_admin())
    or (p_status = 'archived' and v_from = 'published' and public.is_admin())
    or (p_status = 'draft')
  ) then raise exception 'invalid_transition % -> %', v_from, p_status; end if;
  if p_type = 'asset' then update public.question_assets set review_status = p_status where id = p_id;
  elsif p_type = 'adventure' then update public.adventures set status = p_status where id = p_id;
  else update public.adventure_chapters set status = p_status where id = p_id; end if;
  insert into public.content_reviews (content_type, content_id, reviewer_id, from_status, to_status, note)
  values (p_type, p_id, auth.uid(), v_from, p_status, p_note);
  perform public._audit('content.status', p_type, p_id, jsonb_build_object('from', v_from, 'to', p_status, 'note', p_note));
end $$;

revoke execute on function public.admin_set_content_status(text, text, public.content_status, text) from public, anon;
grant execute on function public.admin_set_content_status(text, text, public.content_status, text) to authenticated;

-- Staff can read full question rows (including answers) for review; players cannot.
grant select on public.questions to authenticated;
-- Admin dashboard reads
grant select on public.content_reviews, public.admin_audit_log, public.reports to authenticated;

-- ===== 20261114000004_admin_content_tools.sql =====
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

-- ===== 20261116000005_hardening_and_gameplay.sql =====
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

-- ===== 20261116000006_merge_read_policies.sql =====
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

-- ===== 20261117000007_testament_choice.sql =====
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

-- ===== 20261122000008_quick_review.sql =====
-- Quick human review: staff record a reviewer decision on many questions at once.
-- This records the human sign-off in questions.verification; it does not change whether
-- a question is published. Every call is written to content_reviews and the audit log.
create or replace function public.admin_review_questions(
  p_ids text[], p_decision text, p_note text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'needs_fix') then raise exception 'invalid_decision'; end if;
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) > 100 then raise exception 'invalid_ids'; end if;
  if p_decision = 'needs_fix' and coalesce(btrim(p_note), '') = '' then raise exception 'note_required'; end if;

  update public.questions q
     set verification = coalesce(q.verification, '{}'::jsonb)
           || jsonb_build_object(
                'human_review', p_decision,
                'reviewed_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
                'reviewed_by', auth.uid(),
                'review_method', 'Quick review in admin dashboard: reviewer read the question, answer, KJV text and automated check',
                'review_note', nullif(btrim(coalesce(p_note, '')), '')),
         updated_at = now()
   where q.id = any(p_ids);
  get diagnostics v_count = row_count;

  insert into public.content_reviews (content_type, content_id, reviewer_id, from_status, to_status, note)
  select 'question', q.id, auth.uid(), q.status, q.status, 'human review: ' || p_decision || coalesce(' — ' || nullif(btrim(p_note), ''), '')
    from public.questions q where q.id = any(p_ids);
  perform public._audit('question.human_review', 'question', array_to_string(p_ids, ','),
    jsonb_build_object('decision', p_decision, 'count', v_count, 'note', p_note));
  return v_count;
end $$;

revoke execute on function public.admin_review_questions(text[], text, text) from public, anon;
grant execute on function public.admin_review_questions(text[], text, text) to authenticated;

-- ===== 20261122000009_clue_passages.sql =====
-- Who Am I? clue passages (22 Nov 2026).
--   * questions.clue_refs: for each clue, the KJV passage(s) behind it: [[{ref, text}, ...], ...].
--   * Returned by submit_answer only after the answer is locked in (like verse_text).
--     The public view published_questions lists its columns explicitly, so clue_refs is not exposed before answering.
alter table public.questions add column if not exists clue_refs jsonb;

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
    'clue_refs', v_q.clue_refs,
    'points', case when v_correct then v_points else 0 end);
end $$;

commit;
