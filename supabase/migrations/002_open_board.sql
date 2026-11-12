-- No-login board (demo): board runs through security definer RPCs keyed by the session uuid.
revoke execute on function att_is_admin() from anon, public;
grant execute on function att_is_admin() to authenticated;

alter table att_sessions alter column created_by drop not null;

create or replace function att_open_board(p_new boolean default false, p_title text default null)
returns att_sessions language plpgsql security definer set search_path = public as $$
declare s att_sessions;
begin
  if not p_new then
    select * into s from att_sessions where is_active order by created_at desc limit 1;
    if s.id is not null then return s; end if;
  end if;
  update att_sessions set is_active = false where is_active;
  insert into att_sessions (title, code, created_by)
  values (coalesce(nullif(trim(p_title), ''), 'Attendance – ' || to_char(now(), 'DD Mon YYYY')),
          lpad(floor(random() * 10000)::int::text, 4, '0'), auth.uid())
  returning * into s;
  return s;
end $$;

create or replace function att_board_feed(p_session uuid)
returns table (id uuid, session_id uuid, first_name text, last_name text, device_id text, hidden boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.session_id, c.first_name, c.last_name, c.device_id, c.hidden, c.created_at
    from att_checkins c where c.session_id = p_session order by c.created_at;
$$;

create or replace function att_board_session(p_session uuid)
returns att_sessions language sql stable security definer set search_path = public as $$
  select * from att_sessions where id = p_session;
$$;

create or replace function att_hide_checkin(p_session uuid, p_id uuid)
returns void language sql security definer set search_path = public as $$
  update att_checkins set hidden = true where id = p_id and session_id = p_session;
$$;

create or replace function att_end_session(p_session uuid)
returns void language sql security definer set search_path = public as $$
  update att_sessions set is_active = false where id = p_session;
$$;

create or replace function att_rotate_code(p_session uuid)
returns text language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  new_code := lpad(floor(random() * 10000)::int::text, 4, '0');
  update att_sessions set prev_code = code, code = new_code, code_rotated_at = now()
   where id = p_session and is_active;
  return new_code;
end $$;

grant execute on function att_open_board(boolean, text), att_board_feed(uuid), att_board_session(uuid),
  att_hide_checkin(uuid, uuid), att_end_session(uuid), att_rotate_code(uuid) to anon, authenticated;
