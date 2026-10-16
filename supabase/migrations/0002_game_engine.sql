-- Milestone 2-4: date sessions, game engine, secret responses, projections, realtime auth.

-- ---------- tables ----------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  game_type text not null check (game_type in ('truth_or_truth','deep_talk','would_you_rather','most_likely','know_me')),
  category text not null,
  depth text not null check (depth in ('fun','sweet','romantic','deep','vulnerable')),
  prompt text not null check (char_length(prompt) between 1 and 400),
  option_a text,
  option_b text,
  follow_up text,
  active boolean not null default true,
  is_custom boolean not null default false,
  created_by_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index questions_game_idx on public.questions (game_type, category) where active;

create table public.date_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  status text not null default 'active' check (status in ('active','finished')),
  started_by uuid not null references public.members(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  version int not null default 1
);
create unique index one_active_date on public.date_sessions (space_id) where status = 'active';

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  date_session_id uuid not null references public.date_sessions(id) on delete cascade,
  game_type text not null check (game_type in ('truth_or_truth','deep_talk','would_you_rather','most_likely')),
  status text not null default 'active' check (status in ('active','paused','finished')),
  current_round_number int not null default 0,
  current_round_id uuid,
  turn_member_id uuid references public.members(id),
  state_version int not null default 1,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index one_open_game_per_date on public.game_sessions (date_session_id) where status in ('active','paused');

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_number int not null,
  question_id uuid not null references public.questions(id),
  alternate_question_id uuid references public.questions(id),
  chosen_side text check (chosen_side in ('left','right')),
  phase text not null check (phase in ('pending','question_selected','answering','revealed','completed','skipped')),
  turn_member_id uuid references public.members(id),
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_session_id, round_number)
);

create table public.game_responses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.game_rounds(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  response_json jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (round_id, member_id)
);

create table public.question_history (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  played_at timestamptz not null default now()
);
create index question_history_idx on public.question_history (space_id, question_id, played_at);

create table public.saved_moments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  date_session_id uuid references public.date_sessions(id) on delete set null,
  question_id uuid references public.questions(id) on delete set null,
  content text not null check (char_length(content) between 1 and 500),
  proposed_by_member_id uuid not null references public.members(id) on delete cascade,
  approved_by_other_at timestamptz,
  created_at timestamptz not null default now()
);

-- Deny by default: no direct client access. Everything goes through RPC projections.
alter table public.questions enable row level security;
alter table public.date_sessions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_responses enable row level security;
alter table public.question_history enable row level security;
alter table public.saved_moments enable row level security;
revoke all on public.questions, public.date_sessions, public.game_sessions, public.game_rounds,
  public.game_responses, public.question_history, public.saved_moments from anon, authenticated;

-- ---------- internal helpers (not callable by clients) ----------
create or replace function public._me() returns public.members
language plpgsql stable security definer set search_path = public as $$
declare m public.members;
begin
  select * into m from public.members where auth_user_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
  return m;
end $$;

create or replace function public._notify(p_space uuid, p_version int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(jsonb_build_object('version', p_version), 'session-updated', 'space:' || p_space::text, true);
exception when others then
  null; -- realtime is a hint; polling reconciles
end $$;

create or replace function public._other_member(p_space uuid, p_member uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where space_id = p_space and id <> p_member limit 1
$$;

create or replace function public._draw_question(
  p_space uuid, p_game uuid, p_type text, p_categories text[], p_vulnerable boolean, p_exclude uuid[]
) returns uuid
language sql security definer set search_path = public as $$
  select q.id from public.questions q
  where q.active and q.game_type = p_type
    and (p_categories is null or q.category = any(p_categories))
    and (p_vulnerable or q.depth <> 'vulnerable')
    and q.id <> all(p_exclude)
    and not exists (
      select 1 from public.game_rounds r
      where r.game_session_id = p_game and (r.question_id = q.id or r.alternate_question_id = q.id))
  order by exists (select 1 from public.question_history h where h.space_id = p_space and h.question_id = q.id) asc,
           random()
  limit 1
$$;

-- Creates the next round for a (locked) game. Server-side randomness, persisted on the round.
create or replace function public._new_round(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g public.game_sessions;
  cats text[]; vuln boolean;
  q1 uuid; q2 uuid; c1 text;
  next_turn uuid; n int; rid uuid; prev_turn uuid;
begin
  select * into g from public.game_sessions where id = p_game;
  cats := case when g.settings_json ? 'categories'
    then array(select jsonb_array_elements_text(g.settings_json->'categories')) else null end;
  vuln := coalesce((g.settings_json->>'vulnerable')::boolean, false);

  select turn_member_id into prev_turn from public.game_rounds
    where game_session_id = p_game order by round_number desc limit 1;
  next_turn := case when prev_turn is null then g.turn_member_id
                    else public._other_member(g.space_id, prev_turn) end;
  n := g.current_round_number + 1;
  rid := gen_random_uuid();

  if g.game_type = 'truth_or_truth' then
    q1 := public._draw_question(g.space_id, p_game, g.game_type, cats, vuln, '{}');
    if q1 is null then raise exception 'exhausted'; end if;
    select category into c1 from public.questions where id = q1;
    q2 := public._draw_question(g.space_id, p_game, g.game_type,
      array(select distinct category from public.questions
            where game_type = g.game_type and active and category <> c1
              and (cats is null or category = any(cats)) and (vuln or depth <> 'vulnerable')),
      vuln, array[q1]);
    if q2 is null then q2 := public._draw_question(g.space_id, p_game, g.game_type, cats, vuln, array[q1]); end if;
    if q2 is null then raise exception 'exhausted'; end if;
    -- randomize which side the same-category-first pick lands on
    if random() < 0.5 then
      insert into public.game_rounds(id, game_session_id, round_number, question_id, alternate_question_id, phase, turn_member_id)
        values (rid, p_game, n, q1, q2, 'pending', next_turn);
    else
      insert into public.game_rounds(id, game_session_id, round_number, question_id, alternate_question_id, phase, turn_member_id)
        values (rid, p_game, n, q2, q1, 'pending', next_turn);
    end if;
  elsif g.game_type = 'deep_talk' then
    q1 := public._draw_question(g.space_id, p_game, g.game_type, cats, vuln, '{}');
    if q1 is null then raise exception 'exhausted'; end if;
    insert into public.game_rounds(id, game_session_id, round_number, question_id, phase, turn_member_id)
      values (rid, p_game, n, q1, 'pending', next_turn);
  else
    q1 := public._draw_question(g.space_id, p_game, g.game_type, null, false, '{}');
    if q1 is null then raise exception 'exhausted'; end if;
    insert into public.game_rounds(id, game_session_id, round_number, question_id, phase, turn_member_id)
      values (rid, p_game, n, q1, 'answering', next_turn);
    insert into public.question_history(space_id, question_id) values (g.space_id, q1);
  end if;

  update public.game_sessions
    set current_round_number = n, current_round_id = rid, turn_member_id = next_turn
    where id = p_game;
end $$;

-- Viewer-safe projection. Hidden content (candidate prompts, partner answers) is never included.
create or replace function public._state(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m public.members; g public.game_sessions; r public.game_rounds;
  q public.questions; qa public.questions; qe public.questions;
  members_json jsonb; round_json jsonb; mine jsonb; partner_done boolean; cnt int; choices jsonb;
begin
  m := public._me();
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id;
  if not found then raise exception 'not_found'; end if;
  select jsonb_agg(jsonb_build_object('id', id, 'seat', seat, 'name', display_name) order by seat)
    into members_json from public.members where space_id = m.space_id;
  select * into r from public.game_rounds where id = g.current_round_id;

  if r.id is not null then
    select * into q from public.questions where id = r.question_id;
    round_json := jsonb_build_object('id', r.id, 'number', r.round_number, 'phase', r.phase, 'turnMemberId', r.turn_member_id);

    if g.game_type = 'truth_or_truth' then
      select * into qa from public.questions where id = r.alternate_question_id;
      if r.chosen_side is null then
        round_json := round_json || jsonb_build_object('choices', jsonb_build_array(
          jsonb_build_object('side', 'left', 'label', q.category || ' Truth'),
          jsonb_build_object('side', 'right', 'label', qa.category || ' Truth')));
      else
        qe := case when r.chosen_side = 'left' then q else qa end;
        round_json := round_json || jsonb_build_object('category', qe.category, 'prompt', qe.prompt, 'followUp', qe.follow_up, 'questionId', qe.id);
      end if;

    elsif g.game_type = 'deep_talk' then
      round_json := round_json || jsonb_build_object('category', q.category);
      if r.phase <> 'pending' then
        round_json := round_json || jsonb_build_object('prompt', q.prompt, 'followUp', q.follow_up, 'questionId', q.id);
      end if;

    else
      select response_json into mine from public.game_responses where round_id = r.id and member_id = m.id;
      select count(*) into cnt from public.game_responses where round_id = r.id;
      partner_done := exists (select 1 from public.game_responses where round_id = r.id and member_id <> m.id);
      round_json := round_json || jsonb_build_object(
        'category', q.category, 'prompt', q.prompt,
        'myChoice', mine->'value', 'partnerSubmitted', partner_done, 'questionId', q.id);
      if g.game_type = 'would_you_rather' then
        round_json := round_json || jsonb_build_object('optionA', q.option_a, 'optionB', q.option_b);
      end if;
      if r.phase in ('revealed','completed') then
        select jsonb_object_agg(member_id::text, response_json->>'value') into choices
          from public.game_responses where round_id = r.id;
        round_json := round_json || jsonb_build_object('choices', choices, 'followUp', q.follow_up,
          'same', (select count(distinct response_json->>'value') = 1 from public.game_responses where round_id = r.id));
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'game', jsonb_build_object('id', g.id, 'type', g.game_type, 'status', g.status, 'version', g.state_version,
      'roundNumber', g.current_round_number, 'dateId', g.date_session_id, 'turnMemberId', g.turn_member_id,
      'settings', g.settings_json),
    'me', jsonb_build_object('memberId', m.id, 'seat', m.seat),
    'members', members_json,
    'round', round_json);
end $$;

revoke all on function public._me(), public._notify(uuid,int), public._other_member(uuid,uuid),
  public._draw_question(uuid,uuid,text,text[],boolean,uuid[]), public._new_round(uuid), public._state(uuid)
  from public, anon, authenticated;

-- ---------- public RPCs (authenticated; identity always derived from auth.uid()) ----------

create or replace function public.get_preferences() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  return (select preferences_json from public.couple_spaces where id = m.space_id);
end $$;

create or replace function public.set_preferences(p_prefs jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  update public.couple_spaces set preferences_json = p_prefs, updated_at = now() where id = m.space_id;
  return p_prefs;
end $$;

create or replace function public._date_json(d public.date_sessions) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.game_sessions;
begin
  select * into g from public.game_sessions where date_session_id = d.id and status in ('active','paused') limit 1;
  return jsonb_build_object(
    'id', d.id, 'status', d.status, 'version', d.version, 'startedAt', d.started_at, 'finishedAt', d.finished_at,
    'activeGame', case when g.id is null then null else jsonb_build_object('id', g.id, 'type', g.game_type, 'status', g.status) end,
    'summary', jsonb_build_object(
      'games', (select count(*) from public.game_sessions where date_session_id = d.id),
      'prompts', (select count(*) from public.game_rounds r join public.game_sessions s on s.id = r.game_session_id
                  where s.date_session_id = d.id and r.phase in ('completed','skipped','revealed','question_selected')),
      'moments', (select count(*) from public.saved_moments where date_session_id = d.id and approved_by_other_at is not null)));
end $$;
revoke all on function public._date_json(public.date_sessions) from public, anon, authenticated;

create or replace function public.get_active_date() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members; d public.date_sessions;
begin
  m := public._me();
  select * into d from public.date_sessions where space_id = m.space_id and status = 'active';
  if not found then return null; end if;
  return public._date_json(d);
end $$;

create or replace function public.get_date(p_date uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members; d public.date_sessions;
begin
  m := public._me();
  select * into d from public.date_sessions where id = p_date and space_id = m.space_id;
  if not found then raise exception 'not_found'; end if;
  return public._date_json(d);
end $$;

-- Idempotent: returns the existing active date if one exists.
create or replace function public.start_date() returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; d public.date_sessions;
begin
  m := public._me();
  perform 1 from public.couple_spaces where id = m.space_id for update;
  select * into d from public.date_sessions where space_id = m.space_id and status = 'active';
  if not found then
    insert into public.date_sessions(space_id, started_by) values (m.space_id, m.id) returning * into d;
    perform public._notify(m.space_id, d.version);
  end if;
  return public._date_json(d);
end $$;

create or replace function public.finish_date(p_date uuid, p_expected int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; d public.date_sessions;
begin
  m := public._me();
  select * into d from public.date_sessions where id = p_date and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if d.status = 'finished' then return public._date_json(d); end if; -- idempotent
  if d.version <> p_expected then raise exception 'version_conflict'; end if;
  update public.game_sessions set status = 'finished', ended_at = now(), state_version = state_version + 1
    where date_session_id = d.id and status <> 'finished';
  update public.date_sessions set status = 'finished', finished_at = now(), version = version + 1
    where id = d.id returning * into d;
  perform public._notify(m.space_id, d.version);
  return public._date_json(d);
end $$;

create or replace function public.start_game(p_date uuid, p_type text, p_settings jsonb, p_replace boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; d public.date_sessions; g public.game_sessions; settings jsonb;
begin
  m := public._me();
  if p_type not in ('truth_or_truth','deep_talk','would_you_rather','most_likely') then
    raise exception 'invalid_request';
  end if;
  select * into d from public.date_sessions where id = p_date and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if d.status <> 'active' then raise exception 'illegal_phase'; end if;

  select * into g from public.game_sessions where date_session_id = d.id and status in ('active','paused') for update;
  if found then
    if g.game_type = p_type and not p_replace then return public._state(g.id); end if;
    if not p_replace then raise exception 'game_active'; end if;
    update public.game_sessions set status = 'finished', ended_at = now(), state_version = state_version + 1 where id = g.id;
  end if;

  settings := coalesce(p_settings, '{}'::jsonb);
  insert into public.game_sessions(space_id, date_session_id, game_type, turn_member_id, settings_json)
    values (m.space_id, d.id, p_type, m.id, settings) returning * into g;
  perform public._new_round(g.id);
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

create or replace function public.get_game_state(p_game uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  return public._state(p_game);
end $$;

create or replace function public.select_option(p_game uuid, p_expected int, p_choice text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions; r public.game_rounds; qid uuid;
begin
  m := public._me();
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.status <> 'active' then raise exception 'illegal_phase'; end if;
  if g.state_version <> p_expected then raise exception 'version_conflict'; end if;
  select * into r from public.game_rounds where id = g.current_round_id for update;
  if r.phase <> 'pending' then raise exception 'illegal_phase'; end if;

  if g.game_type = 'truth_or_truth' then
    if r.turn_member_id <> m.id then raise exception 'not_your_turn'; end if;
    if p_choice not in ('left','right') then raise exception 'invalid_request'; end if;
    update public.game_rounds set chosen_side = p_choice, phase = 'question_selected' where id = r.id;
    qid := case when p_choice = 'left' then r.question_id else r.alternate_question_id end;
  elsif g.game_type = 'deep_talk' then
    if p_choice <> 'open' then raise exception 'invalid_request'; end if;
    update public.game_rounds set phase = 'question_selected' where id = r.id;
    qid := r.question_id;
  else
    raise exception 'illegal_phase';
  end if;
  insert into public.question_history(space_id, question_id) values (g.space_id, qid);
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

-- Secret vote. Serialised per game so the reveal happens exactly once. Idempotent per member.
create or replace function public.submit_choice(p_game uuid, p_value text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions; r public.game_rounds; valid boolean; cnt int;
begin
  m := public._me();
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.game_type not in ('would_you_rather','most_likely') then raise exception 'illegal_phase'; end if;
  if g.status <> 'active' then raise exception 'illegal_phase'; end if;
  select * into r from public.game_rounds where id = g.current_round_id for update;

  if exists (select 1 from public.game_responses where round_id = r.id and member_id = m.id) then
    return public._state(g.id); -- already submitted: idempotent, value cannot change
  end if;
  if r.phase <> 'answering' then raise exception 'illegal_phase'; end if;

  if g.game_type = 'would_you_rather' then
    valid := p_value in ('A','B');
  else
    valid := exists (select 1 from public.members where space_id = g.space_id and id::text = p_value);
  end if;
  if not valid then raise exception 'invalid_request'; end if;

  insert into public.game_responses(round_id, member_id, response_json)
    values (r.id, m.id, jsonb_build_object('value', p_value));
  select count(*) into cnt from public.game_responses where round_id = r.id;
  if cnt >= 2 then
    update public.game_rounds set phase = 'revealed', revealed_at = now() where id = r.id;
  end if;
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

-- Complete (or skip) the current round and draw the next one. One advance per version.
create or replace function public.advance_round(p_game uuid, p_expected int, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions; r public.game_rounds;
begin
  m := public._me();
  if p_action not in ('next','skip') then raise exception 'invalid_request'; end if;
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.status <> 'active' then raise exception 'illegal_phase'; end if;
  if g.state_version <> p_expected then raise exception 'version_conflict'; end if;
  select * into r from public.game_rounds where id = g.current_round_id for update;

  if p_action = 'next' then
    if g.game_type in ('truth_or_truth','deep_talk') and r.phase <> 'question_selected' then raise exception 'illegal_phase'; end if;
    if g.game_type in ('would_you_rather','most_likely') and r.phase <> 'revealed' then raise exception 'illegal_phase'; end if;
  end if;
  update public.game_rounds set phase = case when p_action = 'skip' then 'skipped' else 'completed' end where id = r.id;
  perform public._new_round(g.id); -- raises 'exhausted' -> whole transaction rolls back
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

create or replace function public.pause_game(p_game uuid, p_expected int, p_pause boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions;
begin
  m := public._me();
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.status = 'finished' then raise exception 'illegal_phase'; end if;
  if g.state_version <> p_expected then raise exception 'version_conflict'; end if;
  update public.game_sessions set status = case when p_pause then 'paused' else 'active' end,
    state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

create or replace function public.finish_game(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions;
begin
  m := public._me();
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.status <> 'finished' then
    update public.game_sessions set status = 'finished', ended_at = now(), state_version = state_version + 1
      where id = g.id returning * into g;
    perform public._notify(m.space_id, g.state_version);
  end if;
  return public._state(g.id);
end $$;

-- ---------- saved moments (explicit, consent required from the other member) ----------
create or replace function public.propose_moment(p_date uuid, p_question uuid, p_content text) returns uuid
language plpgsql security definer set search_path = public as $$
declare m public.members; id uuid;
begin
  m := public._me();
  if char_length(trim(p_content)) = 0 or char_length(p_content) > 500 then raise exception 'invalid_request'; end if;
  insert into public.saved_moments(space_id, date_session_id, question_id, content, proposed_by_member_id)
    values (m.space_id,
            (select d.id from public.date_sessions d where d.id = p_date and d.space_id = m.space_id),
            (select q.id from public.questions q where q.id = p_question),
            trim(p_content), m.id) returning saved_moments.id into id;
  perform public._notify(m.space_id, 0);
  return id;
end $$;

create or replace function public.approve_moment(p_moment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m public.members; s public.saved_moments;
begin
  m := public._me();
  select * into s from public.saved_moments where id = p_moment and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if s.proposed_by_member_id = m.id then raise exception 'not_your_turn'; end if; -- the other member must approve
  update public.saved_moments set approved_by_other_at = coalesce(approved_by_other_at, now()) where id = s.id;
end $$;

create or replace function public.list_moments() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'content', s.content, 'createdAt', s.created_at,
      'prompt', (select prompt from public.questions q where q.id = s.question_id),
      'status', case when s.approved_by_other_at is not null then 'shared'
                     when s.proposed_by_member_id = m.id then 'waiting' else 'needs_approval' end,
      'mine', s.proposed_by_member_id = m.id) order by s.created_at desc)
    from public.saved_moments s where s.space_id = m.space_id), '[]'::jsonb);
end $$;

grant execute on function public.get_preferences(), public.set_preferences(jsonb), public.get_active_date(),
  public.get_date(uuid), public.start_date(), public.finish_date(uuid,int),
  public.start_game(uuid,text,jsonb,boolean), public.get_game_state(uuid), public.select_option(uuid,int,text),
  public.submit_choice(uuid,text), public.advance_round(uuid,int,text), public.pause_game(uuid,int,boolean),
  public.finish_game(uuid), public.propose_moment(uuid,uuid,text), public.approve_moment(uuid),
  public.list_moments()
  to authenticated;
revoke execute on function public.get_preferences(), public.set_preferences(jsonb), public.get_active_date(),
  public.get_date(uuid), public.start_date(), public.finish_date(uuid,int),
  public.start_game(uuid,text,jsonb,boolean), public.get_game_state(uuid), public.select_option(uuid,int,text),
  public.submit_choice(uuid,text), public.advance_round(uuid,int,text), public.pause_game(uuid,int,boolean),
  public.finish_game(uuid), public.propose_moment(uuid,uuid,text), public.approve_moment(uuid),
  public.list_moments()
  from public, anon;

-- ---------- Realtime: private channel `space:<space_id>` for members only ----------
create or replace function public.current_space_id() returns uuid
language sql stable security definer set search_path = public as $$
  select space_id from public.members where auth_user_id = auth.uid() limit 1
$$;
grant execute on function public.current_space_id() to authenticated;

do $$
begin
  execute 'drop policy if exists "space members receive" on realtime.messages';
  execute 'drop policy if exists "space members presence" on realtime.messages';
  execute $p$create policy "space members receive" on realtime.messages for select to authenticated
    using (realtime.topic() = 'space:' || public.current_space_id()::text)$p$;
  execute $p$create policy "space members presence" on realtime.messages for insert to authenticated
    with check (realtime.topic() = 'space:' || public.current_space_id()::text)$p$;
exception when others then
  raise warning 'realtime policies not created: %', sqlerrm;
end $$;
