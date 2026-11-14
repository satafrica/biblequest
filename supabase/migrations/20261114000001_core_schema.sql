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
