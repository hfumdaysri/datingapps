-- Milestone 1: single couple space, seats, invites, recovery, audit, rate limits.
create extension if not exists pgcrypto;

create table public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  anniversary_date date not null,
  theme text not null default 'blush',
  preferences_json jsonb not null default '{}'::jsonb,
  singleton boolean not null default true check (singleton),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Deployment invariant: at most one space.
create unique index couple_spaces_singleton on public.couple_spaces (singleton);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  seat text not null check (seat in ('A','B')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  auth_user_id uuid unique,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (space_id, seat)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.couple_spaces(id) on delete cascade,
  seat text not null check (seat in ('A','B')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.recovery_credentials (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);
create unique index recovery_one_active on public.recovery_credentials (member_id) where revoked_at is null;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  event_type text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

-- Deny by default: RLS on, client roles get only what policies grant.
alter table public.couple_spaces enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.recovery_credentials enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.couple_spaces, public.members, public.invites,
  public.recovery_credentials, public.audit_events, public.rate_limits from anon, authenticated;
grant select on public.couple_spaces, public.members to authenticated;

-- Live membership check, evaluated on every query (rebinding revokes old sessions at once).
create or replace function public.current_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_space_member(p_space uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where space_id = p_space and auth_user_id = auth.uid())
$$;

create policy space_member_read on public.couple_spaces for select to authenticated
  using (public.is_space_member(id));
create policy members_read on public.members for select to authenticated
  using (public.is_space_member(space_id));

-- ---- privileged RPCs: service_role only ----

create or replace function public.provision_space(
  p_name text, p_anniversary date, p_name_a text, p_name_b text,
  p_hash_a text, p_hash_b text, p_expires interval
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_space uuid;
begin
  if exists (select 1 from couple_spaces) then
    raise exception 'already_provisioned' using errcode = 'P0001';
  end if;
  insert into couple_spaces(name, anniversary_date) values (p_name, p_anniversary) returning id into v_space;
  insert into members(space_id, seat, display_name) values (v_space,'A',p_name_a),(v_space,'B',p_name_b);
  insert into invites(space_id, seat, token_hash, expires_at) values
    (v_space,'A',p_hash_a, now()+p_expires),(v_space,'B',p_hash_b, now()+p_expires);
  return v_space;
end $$;

-- Re-issue an invite for an unbound seat (owner CLI only).
create or replace function public.issue_invite(p_seat text, p_hash text, p_expires interval) returns void
language plpgsql security definer set search_path = public as $$
declare v_member members;
begin
  select * into v_member from members where seat = p_seat;
  if not found then raise exception 'no_space'; end if;
  if v_member.auth_user_id is not null then raise exception 'seat_bound'; end if;
  update invites set revoked_at = now()
    where space_id = v_member.space_id and seat = p_seat and used_at is null and revoked_at is null;
  insert into invites(space_id, seat, token_hash, expires_at)
    values (v_member.space_id, p_seat, p_hash, now()+p_expires);
end $$;

-- Atomic: validate invite, bind uid to seat, consume invite.
create or replace function public.redeem_invite(p_hash text, p_uid uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_inv invites; v_member members;
begin
  select * into v_inv from invites where token_hash = p_hash for update;
  if not found or v_inv.used_at is not null or v_inv.revoked_at is not null or v_inv.expires_at < now() then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;
  if exists (select 1 from members where auth_user_id = p_uid) then
    raise exception 'already_bound' using errcode = 'P0001';
  end if;
  select * into v_member from members where space_id = v_inv.space_id and seat = v_inv.seat for update;
  if v_member.auth_user_id is not null then raise exception 'invalid_invite' using errcode = 'P0001'; end if;
  update members set auth_user_id = p_uid, joined_at = now() where id = v_member.id;
  update invites set used_at = now() where id = v_inv.id;
  insert into audit_events(member_id, event_type) values (v_member.id, 'invite_redeemed');
  return v_member.id;
end $$;

-- Replace the active recovery credential for a member.
create or replace function public.set_recovery(p_member uuid, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update recovery_credentials set revoked_at = now(), rotated_at = now()
    where member_id = p_member and revoked_at is null;
  insert into recovery_credentials(member_id, secret_hash) values (p_member, p_hash);
end $$;

create or replace function public.get_recovery_hash(p_member uuid) returns text
language sql security definer set search_path = public as $$
  select secret_hash from recovery_credentials where member_id = p_member and revoked_at is null
$$;

-- Rebind a seat to a new auth user. Old uid loses access immediately (RLS checks live binding).
create or replace function public.rebind_member(p_member uuid, p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from members where auth_user_id = p_uid and id <> p_member) then
    raise exception 'already_bound' using errcode = 'P0001';
  end if;
  update members set auth_user_id = p_uid where id = p_member;
  insert into audit_events(member_id, event_type) values (p_member, 'recovery_redeemed');
end $$;

-- Fixed-window rate limiter. Returns true if allowed.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public as $$
declare v rate_limits;
begin
  insert into rate_limits(key) values (p_key) on conflict (key) do nothing;
  select * into v from rate_limits where key = p_key for update;
  if v.window_start < now() - p_window then
    update rate_limits set window_start = now(), hits = 1 where key = p_key;
    return true;
  end if;
  update rate_limits set hits = hits + 1 where key = p_key;
  return v.hits + 1 <= p_max;
end $$;

revoke all on function public.provision_space(text,date,text,text,text,text,interval),
  public.issue_invite(text,text,interval), public.redeem_invite(text,uuid),
  public.set_recovery(uuid,text), public.get_recovery_hash(uuid),
  public.rebind_member(uuid,uuid), public.check_rate_limit(text,int,interval)
  from public, anon, authenticated;
grant execute on function public.provision_space(text,date,text,text,text,text,interval),
  public.issue_invite(text,text,interval), public.redeem_invite(text,uuid),
  public.set_recovery(uuid,text), public.get_recovery_hash(uuid),
  public.rebind_member(uuid,uuid), public.check_rate_limit(text,int,interval)
  to service_role;
grant execute on function public.current_member_id(), public.is_space_member(uuid) to authenticated;
