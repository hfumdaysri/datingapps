-- Deleting a space (privacy "delete shared data") must cascade cleanly.
alter table public.game_rounds drop constraint game_rounds_turn_member_id_fkey,
  add constraint game_rounds_turn_member_id_fkey foreign key (turn_member_id) references public.members(id) on delete set null;
alter table public.game_sessions drop constraint game_sessions_turn_member_id_fkey,
  add constraint game_sessions_turn_member_id_fkey foreign key (turn_member_id) references public.members(id) on delete set null;
alter table public.date_sessions drop constraint date_sessions_started_by_fkey,
  add constraint date_sessions_started_by_fkey foreign key (started_by) references public.members(id) on delete cascade;
