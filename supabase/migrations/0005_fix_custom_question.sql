-- Fix: variable named "id" clashed with the members.id column reference.
create or replace function public.add_custom_question(
  p_type text, p_category text, p_prompt text, p_a text, p_b text, p_follow text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare m public.members; v_depth text; v_qid uuid; v_count int;
begin
  m := public._me();
  if p_type not in ('truth_or_truth','deep_talk','would_you_rather','most_likely','know_me') then raise exception 'invalid_request'; end if;
  if char_length(trim(coalesce(p_prompt, ''))) = 0 or char_length(p_prompt) > 300 then raise exception 'invalid_request'; end if;
  if p_type = 'would_you_rather' and (coalesce(trim(p_a), '') = '' or coalesce(trim(p_b), '') = ''
      or char_length(p_a) > 200 or char_length(p_b) > 200) then raise exception 'invalid_request'; end if;
  if p_type = 'truth_or_truth' and p_category not in ('Fun','Sweet','Romantic','Deep') then raise exception 'invalid_request'; end if;
  if p_type = 'deep_talk' and p_category not in ('Life','Relationship','Memories','Future','Understanding') then raise exception 'invalid_request'; end if;
  if p_type in ('would_you_rather','most_likely','know_me') then
    p_category := case when p_type = 'know_me' then 'Kenal' else 'Fun' end;
  end if;
  v_depth := case p_category when 'Fun' then 'fun' when 'Sweet' then 'sweet' when 'Romantic' then 'romantic' else 'deep' end;
  if p_type = 'know_me' then v_depth := 'fun'; end if;
  select count(*) into v_count from public.questions q
    where q.is_custom and q.created_by_member_id in (select mm.id from public.members mm where mm.space_id = m.space_id);
  if v_count >= 200 then raise exception 'invalid_request'; end if;
  insert into public.questions(game_type, category, depth, prompt, option_a, option_b, follow_up, is_custom, created_by_member_id)
    values (p_type, p_category, v_depth, trim(p_prompt), nullif(trim(p_a), ''), nullif(trim(p_b), ''), nullif(trim(p_follow), ''), true, m.id)
    returning questions.id into v_qid;
  return v_qid;
end $$;
