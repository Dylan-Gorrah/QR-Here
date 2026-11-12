-- Who counts as an admin
create table att_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- One row per board session
create table att_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Attendance',
  code text not null,                       -- 4-digit code shown under the QR
  prev_code text,                           -- used only if code rotation is on (Phase 6)
  code_rotated_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- One row per person per session
create table att_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references att_sessions(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  last_name  text not null check (char_length(last_name)  between 1 and 40),
  device_id text not null,
  hidden boolean not null default false,    -- admin can hide a name from the board
  created_at timestamptz not null default now(),
  unique (session_id, device_id)            -- one check-in per phone per session
);

create or replace function att_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from att_admins where user_id = auth.uid());
$$;

alter table att_admins   enable row level security;
alter table att_sessions enable row level security;
alter table att_checkins enable row level security;

create policy "admin reads own row" on att_admins
  for select to authenticated using (user_id = auth.uid());
create policy "admins manage sessions" on att_sessions
  for all to authenticated using (att_is_admin()) with check (att_is_admin());
create policy "admins read checkins" on att_checkins
  for select to authenticated using (att_is_admin());
create policy "admins hide checkins" on att_checkins
  for update to authenticated using (att_is_admin()) with check (att_is_admin());
-- No anon policies on purpose. People check in only through att_check_in().

-- The only way a person can check in
create or replace function att_check_in(p_code text, p_first text, p_last text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
declare s att_sessions;
begin
  select * into s from att_sessions
   where is_active
     and (code = trim(p_code)
          or (prev_code = trim(p_code) and code_rotated_at > now() - interval '20 seconds'))
   order by created_at desc limit 1;

  if s.id is null then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into att_checkins (session_id, first_name, last_name, device_id)
  values (s.id, initcap(trim(p_first)), initcap(trim(p_last)), p_device)
  on conflict (session_id, device_id) do nothing;

  if not found then
    return json_build_object('ok', false, 'error', 'already_in', 'title', s.title);
  end if;
  return json_build_object('ok', true, 'title', s.title);
end $$;

revoke all on function att_check_in(text, text, text, text) from public;
grant execute on function att_check_in(text, text, text, text) to anon, authenticated;

-- Live updates for the board
alter publication supabase_realtime add table att_checkins;

-- Phase 6: optional rotating code (admin only)
create or replace function att_rotate_code(p_session uuid)
returns text language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  if not att_is_admin() then
    raise exception 'not allowed';
  end if;
  new_code := lpad(floor(random() * 10000)::int::text, 4, '0');
  update att_sessions
     set prev_code = code, code = new_code, code_rotated_at = now()
   where id = p_session and is_active;
  return new_code;
end $$;

revoke all on function att_rotate_code(uuid) from public;
grant execute on function att_rotate_code(uuid) to authenticated;
