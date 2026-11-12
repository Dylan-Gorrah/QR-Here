# Attendance Demo — Claude Code Plan

## What we're building
A small live attendance demo. People open the site on their phone, type their name and surname once, then scan a QR code on the board using a camera screen inside the site. Their name pops up on the board straight away, each with its own animation.

Admins use the same site. They tap a shield icon at the top, sign in, and the board opens: a big QR code plus a live wall of names.

Hosted on **GitHub Pages** (free, HTTPS, which the camera needs). Backend is **Supabase** (database, admin sign-in, realtime).

---

## Rules for Claude Code
- Work **one phase at a time**. At the end of each phase, stop, say what was done and what to test, and wait for me.
- **Light mode only.** Clean, neat, lots of white space.
- Person screens are **mobile-first**. The board screen is built for a **landscape TV or projector (16:9, 1080p)**.
- Never commit secrets. Only the Supabase URL and the anon/publishable key go in the frontend, and they come from env vars.
- Keep it small. No features beyond this plan unless I ask.

## Stack
- Vite + React + TypeScript + Tailwind CSS
- `@supabase/supabase-js` v2: database, admin auth, realtime
- `qr-scanner` (nimiq) for the in-site camera, because it works on iPhone Safari and Android Chrome
- `qrcode` to draw the QR on the board
- `framer-motion` for the name animations
- `HashRouter` from react-router, because GitHub Pages can't handle refreshes on normal routes

## Routes
| Route | Who | What |
|---|---|---|
| `#/` | Person | Name screen (first name + surname, Done button, shield icon top-right) |
| `#/scan` | Person | Camera Cube (scanner) |
| `#/in?c=1234` | Person | What the board QR opens. Checks in automatically if a name is saved, otherwise asks for the name first |
| `#/done` | Person | "You're on the board" screen |
| `#/admin` | Admin | Sign-in, then start or resume a session |
| `#/board/:id` | Admin | The live board |

## Folder structure
```
src/
  lib/supabase.ts      // client from env vars
  lib/identity.ts      // saved name + device id (localStorage)
  lib/style.ts         // picks each person's unique animation + colour
  pages/NameScreen.tsx
  pages/CameraCube.tsx
  pages/CheckIn.tsx    // handles #/in?c=
  pages/Done.tsx
  pages/AdminLogin.tsx
  pages/AdminHome.tsx
  pages/Board.tsx
  components/ShieldButton.tsx
  components/NameChip.tsx
  components/Spotlight.tsx
supabase/migrations/001_attendance.sql
.github/workflows/deploy.yml
```

---

## Phase 1 — Project setup
**Why:** get an empty app running before adding features.
1. Create the Vite React TS project, add Tailwind, then install supabase-js, qr-scanner, qrcode, framer-motion and react-router-dom.
2. Set `base: '/attendance-demo/'` in `vite.config.ts` (it must match the repo name).
3. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and add `.env.local` to `.gitignore`.
4. Set up HashRouter with placeholder pages for every route above.
5. Set up a light theme: white background, dark grey text, one accent colour, and one clean sans font (e.g. Plus Jakarta Sans).

## Phase 2 — Supabase (database + security)
**Why:** the site is public on GitHub Pages, so the database itself has to block anything we don't allow. Ordinary visitors can only check in through one function. They can't read or change any tables.

All tables start with `att_` so they can safely share a Supabase project with other apps.

Save as `supabase/migrations/001_attendance.sql` and run it (Supabase MCP or the SQL Editor):

```sql
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
```

**Make an admin (I'll do this by hand):**
1. Supabase → Authentication → Users → Add user (email + password, auto-confirm).
2. Run `insert into att_admins (user_id) values ('<that user id>');`

Admin access comes **only** from `att_admins`, so don't switch off sign-ups in the project. Other apps in the same project may still need them.

**Test before moving on:** calling `att_check_in` as anon with a wrong code gives `invalid_code`. Reading `att_checkins` directly as anon returns nothing.

## Phase 3 — Person flow
**Why:** this is what everyone in the room uses, so it has to be quick and obvious.

**Name screen (`#/`)**
- Short title ("Sign in") and two neat fields: **First name** and **Surname**, with large tap targets.
- **Done** button, disabled until both fields are filled. Allow letters, spaces, hyphens and apostrophes, max 40 characters each.
- On Done: save `{first, last}` to localStorage. Create a `device_id` with `crypto.randomUUID()` once and keep it. Then go to `#/scan`.
- If a name is already saved, prefill it.
- Small **shield icon** top-right that goes to `#/admin`. Keep it subtle so it doesn't distract normal users.

**Camera Cube (`#/scan`)**
- Full-screen camera (back camera) with a **square viewfinder** in the middle: rounded corners, animated corner brackets and a soft scan line moving up and down. Text: "Scan the code on the board".
- Ask for camera permission only on this screen.
- On a successful read: check it's our QR (URL with `c=` param), vibrate briefly if supported, call `att_check_in`, then go to `#/done`.
- **If the camera is blocked or fails:** show a "Type the code instead" option with a 4-digit input.
- Link at the bottom: "Not you? Change name" goes back to `#/`.

**Check-in link (`#/in?c=1234`)**
- This is what opens if someone scans the board QR with their phone's normal camera app instead of the site.
- If a name is saved, check in straight away. If not, show the Name screen and check in automatically after Done.

**Done (`#/done`)**
- Big check mark and "You're on the board, {First} {Surname}", plus the session title.
- `already_in`: "You're already signed in."
- `invalid_code`: "That code isn't active. Scan the board again." with a button back to the Camera Cube.

## Phase 4 — Admin + the board
**Why:** this is the screen everyone watches, so it has to look good and never lose names.

**Admin sign-in (`#/admin`)**
- Email + password card using Supabase Auth.
- After sign-in, check the user is in `att_admins`. If not, sign them out and say "This account isn't an admin."
- Admin home: **Start session** (optional title, default "Attendance – {date}") and **Resume** if a session is still active. Starting a new session ends the admin's other active sessions. The 4-digit code is random.

**Board (`#/board/:id`)**: landscape, light mode
- **Left third:** a large QR in a card, encoding `https://<github-user>.github.io/attendance-demo/#/in?c=<code>`. Under it: the 4-digit code in big text, "Scan to sign in", and a live counter "Signed in: N".
- **Right two-thirds:** the names wall. Names wrap neatly and never overlap.
- **When a new name arrives:** it appears big in the centre (spotlight) with that person's own entrance animation for about 2 seconds, then shrinks and moves into its spot on the wall (framer-motion `layoutId`).
- **Queue:** if several people check in at once, show them one after another (about 1 second apart). Speed up if the queue gets long. Never drop a name.
- **On load:** fetch existing check-ins and put them on the wall without the spotlight, so a refresh loses nothing.
- **Realtime:** subscribe to INSERT and UPDATE on `att_checkins` for this session. If the connection drops, refetch when it comes back, and refetch every 15 seconds as a safety net.
- **Admin controls:** a top bar that fades out after a few seconds of no mouse movement, with Fullscreen, End session and Sign out.
- **Hide a name:** click a name and choose "Hide from board" (sets `hidden = true`). This matters because names show live in front of everyone.

## Phase 5 — The unique animations
**Why:** "your name pops up in its own way" is the fun part of the demo.
- In `lib/style.ts`: hash `first + last + device_id` into a number (seed). Use it to pick:
  - **one of ~8 entrance animations:** bounce pop, drop from top, slide + spin, card flip, letters typing in, letters waving in, zoom from blur, small confetti burst
  - **one accent colour** from a palette of ~10 that read well on white
  - **a slight tilt** (−3° to 3°) for the name chip on the wall
- The same person always gets the same style. Two people next to each other should rarely match.
- Keep animations smooth on a cheap laptop: animate only transform and opacity.

## Phase 6 — Optional: rotating QR code
**Why:** stops people checking in from outside the room with a photo of the QR. Off by default, with a toggle on the board.
- Add `att_rotate_code(p_session uuid)`: a security definer function, admin only, that moves `code` to `prev_code`, sets a new random 4-digit code and updates `code_rotated_at`.
- The board calls it every 30 seconds and redraws the QR. The old code still works for 20 seconds, which the check-in function already allows.
- If a code expires while someone is still typing their name, send them to the Camera Cube with "The code refreshed. Scan again."

## Phase 7 — Deploy to GitHub Pages
**Why:** a free HTTPS link that works on any phone.
1. Create the repo `attendance-demo` and push.
2. Add `.github/workflows/deploy.yml`: on push to `main`, run `npm ci`, then `npm run build`, then upload `dist` with `actions/upload-pages-artifact`, then `actions/deploy-pages`.
3. Repo Settings → Secrets and variables → Actions: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and pass them into the build step.
4. Repo Settings → Pages → Source: **GitHub Actions**.
5. Live link: `https://<github-user>.github.io/attendance-demo/`

**Note:** phone cameras only work over HTTPS. To test on a phone before deploying, use `@vitejs/plugin-basic-ssl` with `vite --host`, or just test on the deployed link.

## Phase 8 — Test checklist (on real phones)
- [ ] iPhone Safari and Android Chrome: camera opens, scans, and the name shows on the board within about 1 second
- [ ] Scanning the board QR with the phone's normal camera app still works
- [ ] Same phone scans twice: "already signed in" and no duplicate on the board
- [ ] Refreshing the board keeps every name
- [ ] Wrong or old QR shows a clear error
- [ ] Camera blocked: typing the code works
- [ ] A non-admin account can't open the board
- [ ] 15–20 people checking in quickly: names queue properly and nothing overlaps
- [ ] Hiding a name removes it from the board straight away
