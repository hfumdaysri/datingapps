-- Milestone 6 (v0.2): know_me game, custom prompts, export/delete with mutual consent, rename.

alter table public.game_sessions drop constraint if exists game_sessions_game_type_check;
alter table public.game_sessions add constraint game_sessions_game_type_check
  check (game_type in ('truth_or_truth','deep_talk','would_you_rather','most_likely','know_me'));

alter table public.game_rounds add column if not exists judgment text check (judgment in ('correct','close','different'));
alter table public.game_rounds add column if not exists points int not null default 0;

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  requested_by uuid not null references public.members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','executed','declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index one_pending_request on public.data_requests (space_id) where status = 'pending';
alter table public.data_requests enable row level security;
revoke all on public.data_requests from anon, authenticated;

-- ---------- retention: know_me answer text is deleted when the game/date ends ----------
create or replace function public._purge_know_me(p_game uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.game_responses where round_id in (select id from public.game_rounds where game_session_id = p_game)
    and exists (select 1 from public.game_sessions s where s.id = p_game and s.game_type = 'know_me')
$$;
revoke all on function public._purge_know_me(uuid) from public, anon, authenticated;

-- ---------- projection (adds know_me) ----------
create or replace function public._state(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m public.members; g public.game_sessions; r public.game_rounds;
  q public.questions; qa public.questions; qe public.questions;
  members_json jsonb; round_json jsonb; mine jsonb; partner_done boolean; choices jsonb; scores jsonb;
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

    elsif g.game_type = 'know_me' then
      select response_json into mine from public.game_responses where round_id = r.id and member_id = m.id;
      partner_done := exists (select 1 from public.game_responses where round_id = r.id and member_id <> m.id);
      round_json := round_json || jsonb_build_object(
        'prompt', q.prompt, 'ownerId', r.turn_member_id, 'myAnswer', mine->'text',
        'partnerSubmitted', partner_done, 'questionId', q.id);
      if r.phase in ('revealed','completed') then
        select jsonb_object_agg(member_id::text, response_json->>'text') into choices
          from public.game_responses where round_id = r.id;
        round_json := round_json || jsonb_build_object('answers', choices, 'judgment', r.judgment, 'points', r.points);
      end if;
      if coalesce((g.settings_json->>'noScore')::boolean, false) = false then
        select jsonb_object_agg(mm.id::text, coalesce((
          select sum(gr.points) from public.game_rounds gr
          where gr.game_session_id = g.id and gr.turn_member_id <> mm.id and gr.judgment is not null), 0))
          into scores from public.members mm where mm.space_id = g.space_id;
      end if;

    else
      select response_json into mine from public.game_responses where round_id = r.id and member_id = m.id;
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
    'scores', scores,
    'round', round_json);
end $$;
revoke all on function public._state(uuid) from public, anon, authenticated;

-- ---------- know_me: typed private answers, owner judges ----------
create or replace function public.submit_answer(p_game uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions; r public.game_rounds; cnt int; t text;
begin
  m := public._me();
  t := trim(coalesce(p_text, ''));
  if char_length(t) = 0 or char_length(t) > 200 then raise exception 'invalid_request'; end if;
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.game_type <> 'know_me' or g.status <> 'active' then raise exception 'illegal_phase'; end if;
  select * into r from public.game_rounds where id = g.current_round_id for update;

  if exists (select 1 from public.game_responses where round_id = r.id and member_id = m.id) then
    return public._state(g.id); -- idempotent: cannot edit after submitting
  end if;
  if r.phase <> 'answering' then raise exception 'illegal_phase'; end if;

  insert into public.game_responses(round_id, member_id, response_json)
    values (r.id, m.id, jsonb_build_object('text', t));
  select count(*) into cnt from public.game_responses where round_id = r.id;
  if cnt >= 2 then
    update public.game_rounds set phase = 'revealed', revealed_at = now() where id = r.id;
  end if;
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

-- Only the owner (truth giver) judges. Guesser earns 2/1/0 fun points; recorded once.
create or replace function public.judge_round(p_game uuid, p_expected int, p_judgment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; g public.game_sessions; r public.game_rounds;
begin
  m := public._me();
  if p_judgment not in ('correct','close','different') then raise exception 'invalid_request'; end if;
  select * into g from public.game_sessions where id = p_game and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if g.game_type <> 'know_me' or g.status <> 'active' then raise exception 'illegal_phase'; end if;
  if g.state_version <> p_expected then raise exception 'version_conflict'; end if;
  select * into r from public.game_rounds where id = g.current_round_id for update;
  if r.turn_member_id <> m.id then raise exception 'not_your_turn'; end if;
  if r.phase <> 'revealed' or r.judgment is not null then raise exception 'illegal_phase'; end if;
  update public.game_rounds set judgment = p_judgment,
    points = case p_judgment when 'correct' then 2 when 'close' then 1 else 0 end where id = r.id;
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

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
    if g.game_type = 'know_me' and (r.phase <> 'revealed' or r.judgment is null) then raise exception 'illegal_phase'; end if;
  end if;
  update public.game_rounds set phase = case when p_action = 'skip' then 'skipped' else 'completed' end where id = r.id;
  if g.game_type = 'know_me' then
    delete from public.game_responses where round_id = r.id; -- answer text does not outlive the round
  end if;
  perform public._new_round(g.id);
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
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
    perform public._purge_know_me(g.id);
    perform public._notify(m.space_id, g.state_version);
  end if;
  return public._state(g.id);
end $$;

create or replace function public.finish_date(p_date uuid, p_expected int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; d public.date_sessions; gid uuid;
begin
  m := public._me();
  select * into d from public.date_sessions where id = p_date and space_id = m.space_id for update;
  if not found then raise exception 'not_found'; end if;
  if d.status = 'finished' then return public._date_json(d); end if;
  if d.version <> p_expected then raise exception 'version_conflict'; end if;
  update public.game_sessions set status = 'finished', ended_at = now(), state_version = state_version + 1
    where date_session_id = d.id and status <> 'finished';
  for gid in select id from public.game_sessions where date_session_id = d.id loop
    perform public._purge_know_me(gid);
  end loop;
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
  if p_type not in ('truth_or_truth','deep_talk','would_you_rather','most_likely','know_me') then
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
    perform public._purge_know_me(g.id);
  end if;

  settings := coalesce(p_settings, '{}'::jsonb);
  insert into public.game_sessions(space_id, date_session_id, game_type, turn_member_id, settings_json)
    values (m.space_id, d.id, p_type, m.id, settings) returning * into g;
  perform public._new_round(g.id);
  update public.game_sessions set state_version = state_version + 1 where id = g.id returning * into g;
  perform public._notify(m.space_id, g.state_version);
  return public._state(g.id);
end $$;

-- ---------- custom prompts ----------
create or replace function public.add_custom_question(
  p_type text, p_category text, p_prompt text, p_a text, p_b text, p_follow text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare m public.members; depth text; id uuid; n int;
begin
  m := public._me();
  if p_type not in ('truth_or_truth','deep_talk','would_you_rather','most_likely','know_me') then raise exception 'invalid_request'; end if;
  if char_length(trim(coalesce(p_prompt, ''))) = 0 or char_length(p_prompt) > 300 then raise exception 'invalid_request'; end if;
  if p_type = 'would_you_rather' and (coalesce(trim(p_a), '') = '' or coalesce(trim(p_b), '') = ''
      or char_length(p_a) > 200 or char_length(p_b) > 200) then raise exception 'invalid_request'; end if;
  if p_type = 'truth_or_truth' and p_category not in ('Fun','Sweet','Romantic','Deep') then raise exception 'invalid_request'; end if;
  if p_type = 'deep_talk' and p_category not in ('Life','Relationship','Memories','Future','Understanding') then raise exception 'invalid_request'; end if;
  if p_type in ('would_you_rather','most_likely','know_me') then p_category := case when p_type = 'know_me' then 'Kenal' else 'Fun' end; end if;
  depth := case p_category when 'Fun' then 'fun' when 'Sweet' then 'sweet' when 'Romantic' then 'romantic' else 'deep' end;
  if p_type = 'know_me' then depth := 'fun'; end if;
  select count(*) into n from public.questions where created_by_member_id in (select id from public.members where space_id = m.space_id) and is_custom;
  if n >= 200 then raise exception 'invalid_request'; end if;
  insert into public.questions(game_type, category, depth, prompt, option_a, option_b, follow_up, is_custom, created_by_member_id)
    values (p_type, p_category, depth, trim(p_prompt), nullif(trim(p_a), ''), nullif(trim(p_b), ''), nullif(trim(p_follow), ''), true, m.id)
    returning questions.id into id;
  return id;
end $$;

create or replace function public.list_custom_questions() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  return coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'gameType', q.game_type, 'category', q.category,
      'prompt', q.prompt, 'optionA', q.option_a, 'optionB', q.option_b, 'mine', q.created_by_member_id = m.id) order by q.created_at desc)
    from public.questions q
    where q.is_custom and q.active and q.created_by_member_id in (select id from public.members where space_id = m.space_id)), '[]'::jsonb);
end $$;

create or replace function public.remove_custom_question(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  update public.questions set active = false
    where id = p_id and is_custom and created_by_member_id in (select id from public.members where space_id = m.space_id);
end $$;

-- ---------- rename self ----------
create or replace function public.rename_me(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'invalid_request'; end if;
  update public.members set display_name = trim(p_name) where id = m.id;
  perform public._notify(m.space_id, 0);
end $$;

-- ---------- export (current members only; never includes answers) ----------
create or replace function public.export_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  return jsonb_build_object(
    'exportedAt', now(),
    'space', (select jsonb_build_object('name', name, 'anniversaryDate', anniversary_date, 'preferences', preferences_json)
              from public.couple_spaces where id = m.space_id),
    'members', (select coalesce(jsonb_agg(jsonb_build_object('seat', seat, 'name', display_name, 'joinedAt', joined_at)), '[]'::jsonb)
                from public.members where space_id = m.space_id),
    'dates', (select coalesce(jsonb_agg(jsonb_build_object(
        'startedAt', d.started_at, 'finishedAt', d.finished_at, 'status', d.status,
        'games', (select coalesce(jsonb_agg(jsonb_build_object('type', s.game_type, 'status', s.status,
            'rounds', s.current_round_number, 'startedAt', s.created_at) order by s.created_at), '[]'::jsonb)
          from public.game_sessions s where s.date_session_id = d.id)) order by d.started_at), '[]'::jsonb)
      from public.date_sessions d where d.space_id = m.space_id),
    'moments', (select coalesce(jsonb_agg(jsonb_build_object('content', content, 'createdAt', created_at,
        'shared', approved_by_other_at is not null) order by created_at), '[]'::jsonb)
      from public.saved_moments s where s.space_id = m.space_id and (s.approved_by_other_at is not null or s.proposed_by_member_id = m.id)),
    'customQuestions', (select coalesce(jsonb_agg(jsonb_build_object('gameType', game_type, 'category', category, 'prompt', prompt,
        'optionA', option_a, 'optionB', option_b)), '[]'::jsonb)
      from public.questions q where is_custom and active and created_by_member_id in (select id from public.members where space_id = m.space_id)));
end $$;

-- ---------- delete shared data: one asks, the other must approve ----------
create or replace function public.get_data_request() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.members; r public.data_requests;
begin
  m := public._me();
  select * into r from public.data_requests where space_id = m.space_id and status = 'pending';
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'requestedByMe', r.requested_by = m.id,
    'requesterName', (select display_name from public.members where id = r.requested_by), 'createdAt', r.created_at);
end $$;

create or replace function public.request_data_deletion() returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  m := public._me();
  perform 1 from public.couple_spaces where id = m.space_id for update;
  insert into public.data_requests(space_id, requested_by) values (m.space_id, m.id) on conflict do nothing;
  insert into public.audit_events(member_id, event_type) values (m.id, 'deletion_requested');
  perform public._notify(m.space_id, 0);
  return public.get_data_request();
end $$;

create or replace function public.respond_data_deletion(p_request uuid, p_approve boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m public.members; r public.data_requests;
begin
  m := public._me();
  select * into r from public.data_requests where id = p_request and space_id = m.space_id and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if p_approve and r.requested_by = m.id then raise exception 'not_your_turn'; end if; -- the other member must approve
  if p_approve then
    delete from public.date_sessions where space_id = m.space_id; -- cascades games, rounds, answers
    delete from public.question_history where space_id = m.space_id;
    delete from public.saved_moments where space_id = m.space_id;
    update public.data_requests set status = 'executed', resolved_at = now() where id = r.id;
    insert into public.audit_events(member_id, event_type) values (m.id, 'data_deleted');
  else
    update public.data_requests set status = 'declined', resolved_at = now() where id = r.id;
    insert into public.audit_events(member_id, event_type) values (m.id, 'deletion_declined');
  end if;
  perform public._notify(m.space_id, 0);
  return null;
end $$;

grant execute on function public.submit_answer(uuid,text), public.judge_round(uuid,int,text),
  public.add_custom_question(text,text,text,text,text,text), public.list_custom_questions(),
  public.remove_custom_question(uuid), public.rename_me(text), public.export_data(), public.get_data_request(),
  public.request_data_deletion(), public.respond_data_deletion(uuid,boolean) to authenticated;
revoke execute on function public.submit_answer(uuid,text), public.judge_round(uuid,int,text),
  public.add_custom_question(text,text,text,text,text,text), public.list_custom_questions(),
  public.remove_custom_question(uuid), public.rename_me(text), public.export_data(), public.get_data_request(),
  public.request_data_deletion(), public.respond_data_deletion(uuid,boolean) from public, anon;
