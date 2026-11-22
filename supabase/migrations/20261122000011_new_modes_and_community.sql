-- New game modes (Bible Mystery, Geography Explorer, Hidden Object Adventure, Wisdom Decisions,
-- Parables Explorer, Bible Master Challenge) and community features (friends, groups, challenge matches).
--
-- * questions.extra holds public, mode-specific display data (map markers, case-file clues,
--   hidden-object tap areas). It never contains the correct answer: hidden-object areas are listed
--   without saying which one is the target, and the answer is still only correct_index.
-- * adventures.kind separates journeys, mystery case files and parable journeys.
-- * Community data is only reachable through the security-definer functions below. Community
--   features need a registered (non-guest) account. There is no messaging between players.

-- ---------------------------------------------------------------------------
-- Content structure
-- ---------------------------------------------------------------------------
alter table public.questions add column if not exists extra jsonb;
alter table public.adventures add column if not exists kind text not null default 'journey';
alter table public.adventures drop constraint if exists adventures_kind_check;
alter table public.adventures add constraint adventures_kind_check check (kind in ('journey', 'mystery', 'parables'));
alter table public.adventure_chapters add column if not exists reading jsonb;

insert into public.game_modes (id, name, description, availability, sort_order) values
  ('mystery', 'Bible Mystery', 'Multi-stage investigations with clues.', 'live', 8),
  ('geography', 'Bible Geography Explorer', 'Cities, rivers, mountains and journeys on real maps.', 'live', 9),
  ('hidden', 'Hidden Object Adventure', 'Find objects connected to Bible stories.', 'live', 10),
  ('wisdom', 'Bible Wisdom Decisions', 'Real-life choices connected to biblical teaching.', 'live', 11),
  ('parables', 'Parables Explorer', 'Interactive journeys through the parables of Jesus.', 'live', 12),
  ('master', 'Bible Master Challenge', 'Expert-level challenges across all of Scripture.', 'live', 13),
  ('challenge', 'Challenge Match', 'Play the same questions as friends or a group.', 'live', 15)
on conflict (id) do update set availability = excluded.availability, description = excluded.description;

-- Same definition as 20261114000002 plus the answer-free `extra` column (maps, case stage, hidden-object areas).
-- Keeps security_barrier + security_invoker and no direct grants (20261116000005): players only reach it via start_session.
create or replace view public.published_questions
with (security_barrier = true, security_invoker = true) as
  select q.id, q.game_mode, q.book_id, q.chapter, q.verse_start, q.verse_end,
         q.reference_label, q.difficulty, q.prompt, q.clues,
         case when q.game_mode = 'sequence'
              then (select jsonb_agg(e order by md5(q.id || e)) from jsonb_array_elements_text(q.options) e)
              else q.options end as options,
         q.hint is not null as has_hint,
         q.image_id, coalesce(q.image_alt, a.alt_text) as image_alt,
         a.storage_path as image_path, q.translation_id, q.tags, q.extra
  from public.questions q
  left join public.question_assets a on a.id = q.image_id and a.review_status = 'published'
  where q.status = 'published';
revoke select on public.published_questions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Community tables
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists friend_code text unique;
alter table public.groups add column if not exists invite_code text unique;
alter table public.groups add column if not exists description text check (description is null or char_length(description) <= 200);

create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  source_mode text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  question_ids text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists challenges_group_idx on public.challenges (group_id);
create index if not exists challenges_creator_idx on public.challenges (creator_id);

create table if not exists public.challenge_results (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  correct int not null,
  total int not null,
  points int not null,
  completed_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index if not exists challenge_results_user_idx on public.challenge_results (user_id);

alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_results enable row level security;
-- No direct policies: all access goes through the functions below.
revoke all on public.friendships, public.challenges, public.challenge_results from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.require_member()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if coalesce((select u.is_anonymous from auth.users u where u.id = v_user), true) then raise exception 'account_required'; end if;
  return v_user;
end $$;

create or replace function private.new_code(p_len int)
returns text language sql volatile set search_path = public as $$
  -- No 0/O/1/I/L to avoid misreading codes aloud.
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
    from generate_series(1, p_len);
$$;

create or replace function private.clean_name(p_name text, p_min int, p_max int)
returns text language plpgsql immutable set search_path = public as $$
declare v text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) < p_min or char_length(v) > p_max then raise exception 'invalid_name'; end if;
  if v ~* '(https?://|www\.|\.com\b|\.net\b|\.org\b|@)' then raise exception 'invalid_name'; end if;
  return v;
end $$;

/** Weekly correct answers for a set of players (any mode), used by friend and group boards. */
create or replace function private.weekly_correct(p_user uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(correct_count), 0)::bigint from public.game_sessions
   where user_id = p_user and status = 'completed' and completed_at >= date_trunc('week', now());
$$;

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------
create or replace function public.get_my_friend_code()
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_code text;
begin
  select friend_code into v_code from public.profiles where id = v_user;
  while v_code is null loop
    begin
      update public.profiles set friend_code = private.new_code(8) where id = v_user returning friend_code into v_code;
    exception when unique_violation then v_code := null;
    end;
  end loop;
  return v_code;
end $$;

create or replace function public.send_friend_request(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_other uuid; v_existing public.friendships;
begin
  select id into v_other from public.profiles where friend_code = upper(btrim(p_code));
  if v_other is null then raise exception 'code_not_found'; end if;
  if v_other = v_user then raise exception 'own_code'; end if;
  if (select count(*) from public.friendships where requester_id = v_user and created_at > now() - interval '1 day') >= 30 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.friendships where (requester_id = v_user or addressee_id = v_user) and status = 'accepted') >= 200 then
    raise exception 'friend_limit';
  end if;
  select * into v_existing from public.friendships
   where (requester_id = v_user and addressee_id = v_other) or (requester_id = v_other and addressee_id = v_user);
  if v_existing.requester_id is not null then
    if v_existing.status = 'accepted' then return 'already_friends'; end if;
    if v_existing.requester_id = v_other then   -- they already asked me: accept
      update public.friendships set status = 'accepted', responded_at = now()
       where requester_id = v_other and addressee_id = v_user;
      return 'accepted';
    end if;
    return 'pending';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (v_user, v_other);
  return 'sent';
end $$;

create or replace function public.respond_friend_request(p_requester uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
     where requester_id = p_requester and addressee_id = v_user and status = 'pending';
  else
    delete from public.friendships where requester_id = p_requester and addressee_id = v_user and status = 'pending';
  end if;
  if not found then raise exception 'request_not_found'; end if;
end $$;

create or replace function public.remove_friend(p_other uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  delete from public.friendships
   where (requester_id = v_user and addressee_id = p_other) or (requester_id = p_other and addressee_id = v_user);
end $$;

create or replace function public.list_friends()
returns table (user_id uuid, display_name text, avatar_id text, status text, direction text, weekly_correct bigint, since timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  return query
    select p.id, p.display_name, p.avatar_id, f.status,
           case when f.requester_id = v_user then 'outgoing' else 'incoming' end,
           case when f.status = 'accepted' then private.weekly_correct(p.id) else null end,
           coalesce(f.responded_at, f.created_at)
      from public.friendships f
      join public.profiles p on p.id = case when f.requester_id = v_user then f.addressee_id else f.requester_id end
     where f.requester_id = v_user or f.addressee_id = v_user
     order by f.status, 6 desc nulls last, p.display_name;
end $$;

-- ---------------------------------------------------------------------------
-- Groups (invitation code only; owner and moderators manage members)
-- ---------------------------------------------------------------------------
create or replace function public.create_group(p_name text, p_description text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_id uuid; v_code text; v_name text := private.clean_name(p_name, 3, 60);
begin
  if (select count(*) from public.groups where owner_id = v_user) >= 10 then raise exception 'group_limit'; end if;
  loop
    v_code := private.new_code(6);
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;
  insert into public.groups (name, owner_id, privacy, invite_code, description)
  values (v_name, v_user, 'invite_only', v_code, nullif(btrim(coalesce(p_description, '')), ''))
  returning id into v_id;
  insert into public.group_members (group_id, user_id, member_role) values (v_id, v_user, 'owner');
  return jsonb_build_object('id', v_id, 'invite_code', v_code);
end $$;

create or replace function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_group uuid;
begin
  select id into v_group from public.groups where invite_code = upper(btrim(p_code));
  if v_group is null then raise exception 'code_not_found'; end if;
  if (select count(*) from public.group_members where group_id = v_group) >= 200 then raise exception 'group_full'; end if;
  if (select count(*) from public.group_members where user_id = v_user) >= 30 then raise exception 'group_limit'; end if;
  insert into public.group_members (group_id, user_id, member_role) values (v_group, v_user, 'member') on conflict do nothing;
  return v_group;
end $$;

create or replace function private.group_role(p_group uuid, p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select member_role from public.group_members where group_id = p_group and user_id = p_user;
$$;

create or replace function public.list_my_groups()
returns table (id uuid, name text, description text, my_role text, members bigint, invite_code text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  return query
    select g.id, g.name, g.description, m.member_role,
           (select count(*) from public.group_members x where x.group_id = g.id),
           g.invite_code, g.created_at
      from public.groups g join public.group_members m on m.group_id = g.id and m.user_id = v_user
     order by g.name;
end $$;

create or replace function public.get_group(p_group uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_role text := private.group_role(p_group, v_user); v jsonb;
begin
  if v_role is null then raise exception 'not_a_member'; end if;
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'description', g.description, 'invite_code', g.invite_code, 'my_role', v_role, 'is_owner', g.owner_id = v_user,
    'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', p.id, 'display_name', p.display_name, 'avatar_id', p.avatar_id,
                       'role', m.member_role, 'weekly_correct', private.weekly_correct(p.id), 'is_me', p.id = v_user)
                       order by private.weekly_correct(p.id) desc, p.display_name), '[]'::jsonb)
                  from public.group_members m join public.profiles p on p.id = m.user_id where m.group_id = g.id),
    'challenges', (select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'title', c.title, 'created_at', c.created_at, 'expires_at', c.expires_at,
                       'players', (select count(*) from public.challenge_results r where r.challenge_id = c.id),
                       'played', exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.user_id = v_user))
                       order by c.created_at desc), '[]'::jsonb)
                     from public.challenges c where c.group_id = g.id and c.expires_at > now()))
    into v from public.groups g where g.id = p_group;
  return v;
end $$;

create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  if exists (select 1 from public.groups where id = p_group and owner_id = v_user) then raise exception 'owner_cannot_leave'; end if;
  delete from public.group_members where group_id = p_group and user_id = v_user;
end $$;

create or replace function public.remove_group_member(p_group uuid, p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_role text := private.group_role(p_group, v_user); v_target text := private.group_role(p_group, p_member);
begin
  if v_role not in ('owner', 'moderator') then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_target is null then return; end if;
  if v_target = 'owner' or (v_role = 'moderator' and v_target = 'moderator') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.group_members where group_id = p_group and user_id = p_member;
end $$;

create or replace function public.set_group_moderator(p_group uuid, p_member uuid, p_moderator boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  if private.group_role(p_group, v_user) <> 'owner' then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.group_members set member_role = case when p_moderator then 'moderator' else 'member' end
   where group_id = p_group and user_id = p_member and member_role <> 'owner';
end $$;

create or replace function public.update_group(p_group uuid, p_name text, p_description text default null, p_new_code boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_code text;
begin
  if private.group_role(p_group, v_user) <> 'owner' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_new_code then
    loop v_code := private.new_code(6); exit when not exists (select 1 from public.groups where invite_code = v_code); end loop;
  end if;
  update public.groups set name = private.clean_name(p_name, 3, 60),
         description = nullif(btrim(coalesce(p_description, '')), ''),
         invite_code = coalesce(v_code, invite_code)
   where id = p_group returning invite_code into v_code;
  return v_code;
end $$;

create or replace function public.delete_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  delete from public.groups where id = p_group and owner_id = v_user;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Challenge matches: everyone with the code plays the same questions; one scored attempt each.
-- ---------------------------------------------------------------------------
create or replace function public.create_challenge(p_mode text, p_difficulty int, p_group uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := private.require_member(); v_ids text[]; v_code text; v_title text;
begin
  if p_mode not in ('mixed', 'picture', 'whoami', 'scripture', 'wisdom', 'geography') then raise exception 'invalid_level'; end if;
  if p_difficulty not between 1 and 4 then raise exception 'invalid_level'; end if;
  if p_group is not null and private.group_role(p_group, v_user) is null then raise exception 'not_a_member'; end if;
  if (select count(*) from public.challenges where creator_id = v_user and created_at > now() - interval '1 day') >= 20 then raise exception 'rate_limited'; end if;
  select array_agg(id) into v_ids from (
    select id from public.questions
     where status = 'published' and difficulty <= p_difficulty
       and (case when p_mode = 'mixed' then game_mode in ('picture', 'whoami', 'scripture', 'wisdom', 'geography') else game_mode = p_mode end)
     order by random() limit 10) s;
  if coalesce(array_length(v_ids, 1), 0) < 5 then raise exception 'no_published_content'; end if;
  select coalesce((select name from public.game_modes where id = p_mode), 'Mixed questions') || ' · ' ||
         (array['Beginner', 'Intermediate', 'Advanced', 'Expert'])[p_difficulty] into v_title;
  loop v_code := private.new_code(6); exit when not exists (select 1 from public.challenges where code = v_code); end loop;
  insert into public.challenges (code, creator_id, group_id, title, source_mode, difficulty, question_ids)
  values (v_code, v_user, p_group, v_title, p_mode, p_difficulty, v_ids);
  return v_code;
end $$;

create or replace function public.get_challenge(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := auth.uid(); c public.challenges;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into c from public.challenges where code = upper(btrim(p_code));
  if c.id is null then raise exception 'code_not_found'; end if;
  return jsonb_build_object('code', c.code, 'title', c.title, 'questions', array_length(c.question_ids, 1),
    'created_at', c.created_at, 'expires_at', c.expires_at, 'expired', c.expires_at <= now(),
    'creator', (select display_name from public.profiles where id = c.creator_id),
    'group', (select name from public.groups where id = c.group_id),
    'played', exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.user_id = v_user),
    'results', (select coalesce(jsonb_agg(jsonb_build_object('display_name', p.display_name, 'correct', r.correct, 'total', r.total,
                  'points', r.points, 'is_me', r.user_id = v_user, 'completed_at', r.completed_at) order by r.points desc, r.completed_at), '[]'::jsonb)
                  from public.challenge_results r join public.profiles p on p.id = r.user_id where r.challenge_id = c.id));
end $$;

create or replace function public.list_my_challenges()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := private.require_member();
begin
  return (select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('code', c.code, 'title', c.title, 'created_at', c.created_at, 'expires_at', c.expires_at,
           'group', (select name from public.groups where id = c.group_id), 'mine', c.creator_id = v_user,
           'players', (select count(*) from public.challenge_results r where r.challenge_id = c.id),
           'played', exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.user_id = v_user)) as x
      from public.challenges c
     where c.expires_at > now() - interval '7 days'
       and (c.creator_id = v_user or exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.user_id = v_user))
     limit 30) s);
end $$;

-- ---------------------------------------------------------------------------
-- Sessions: new level modes, the Master Challenge and challenge matches
-- ---------------------------------------------------------------------------
create or replace function public.start_session(p_level_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_parts text[] := string_to_array(p_level_key, ':');
  v_mode text; v_diff int := 1; v_set int; v_part text; v_ids text[]; v_session uuid; v_date date; v_ch public.challenges;
  v_level_size constant int := 8;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  if v_parts[1] in ('picture', 'whoami', 'scripture', 'sequence', 'geography', 'wisdom', 'hidden')
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

  elsif v_parts[1] = 'master' and (array_length(v_parts, 1) = 1 or (array_length(v_parts, 1) = 2 and v_parts[2] in ('ot', 'nt'))) then
    v_mode := 'master'; v_diff := 4; v_part := upper(v_parts[2]);
    select array_agg(id) into v_ids from (
      select id from public.questions
       where status = 'published' and difficulty = 4 and game_mode in ('picture', 'whoami', 'scripture', 'sequence', 'wisdom', 'geography', 'mystery', 'hidden')
         and (v_part is null or book_id in (select b.id from public.bible_books b where b.testament = v_part))
       order by random() limit 12) s;

  elsif v_parts[1] = 'challenge' and array_length(v_parts, 1) = 2 then
    v_mode := 'challenge';
    select * into v_ch from public.challenges where code = upper(v_parts[2]);
    if v_ch.id is null then raise exception 'code_not_found'; end if;
    if v_ch.expires_at <= now() then raise exception 'challenge_expired'; end if;
    v_diff := v_ch.difficulty;
    select array_agg(qid order by ord) into v_ids from unnest(v_ch.question_ids) with ordinality as u(qid, ord)
     where exists (select 1 from public.questions q where q.id = u.qid and q.status = 'published');

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

create or replace function public.complete_session(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_s public.game_sessions; v_total int; v_bonus jsonb := '[]'::jsonb;
  v_applied int; v_balance bigint; v_adv text; v_parts text[]; v_points int;
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

  if v_s.game_mode in ('picture', 'whoami', 'scripture', 'sequence', 'adventure', 'geography', 'wisdom', 'hidden', 'master') then
    select applied into v_applied from public._apply_gems(v_user, public._rule('level_complete'), 'Level completed', 'level', v_s.level_key, 'level:' || v_s.level_key);
    if v_applied > 0 then v_bonus := v_bonus || jsonb_build_object('reason', 'Level completed', 'gems', v_applied); end if;
    if v_s.correct_count = v_total then
      select applied into v_applied from public._apply_gems(v_user, public._rule('perfect_round'), 'Perfect round', 'level', v_s.level_key, 'perfect:' || v_s.level_key);
      if v_applied > 0 then v_bonus := v_bonus || jsonb_build_object('reason', 'Perfect round', 'gems', v_applied); end if;
    end if;
  end if;

  if v_s.game_mode = 'challenge' then
    select coalesce(sum(points), 0) into v_points from public.session_answers where session_id = p_session;
    insert into public.challenge_results (challenge_id, user_id, correct, total, points)
    select c.id, v_user, v_s.correct_count, v_total, v_points from public.challenges c where c.code = upper(v_parts[2])
    on conflict do nothing;
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
-- Moderation of player-made names (staff only)
-- ---------------------------------------------------------------------------
create or replace function public.admin_moderate(p_target_type text, p_target_id text, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_target_type = 'profile' and p_action = 'reset_name' then
    update public.profiles set display_name = 'Pilgrim', updated_at = now() where id = p_target_id::uuid;
  elsif p_target_type = 'group' and p_action = 'reset_name' then
    update public.groups set name = 'Renamed group', description = null where id = p_target_id::uuid;
  elsif p_target_type = 'group' and p_action = 'delete' then
    delete from public.groups where id = p_target_id::uuid;
  else
    raise exception 'invalid_action';
  end if;
  perform public._audit('moderate_' || p_action, p_target_type, p_target_id, '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'get_my_friend_code()', 'send_friend_request(text)', 'respond_friend_request(uuid, boolean)', 'remove_friend(uuid)', 'list_friends()',
    'create_group(text, text)', 'join_group(text)', 'list_my_groups()', 'get_group(uuid)', 'leave_group(uuid)', 'remove_group_member(uuid, uuid)',
    'set_group_moderator(uuid, uuid, boolean)', 'update_group(uuid, text, text, boolean)', 'delete_group(uuid)',
    'create_challenge(text, int, uuid)', 'get_challenge(text)', 'list_my_challenges()', 'complete_session(uuid)', 'admin_moderate(text, text, text)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function private.require_member(), private.new_code(int), private.clean_name(text, int, int), private.weekly_correct(uuid), private.group_role(uuid, uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
