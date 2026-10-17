-- Phase 1 step 1: profiles and roles.
--
-- A profile is the person behind a login. id is the same value as auth.users.id
-- (the brief calls this user_id). New people are always students. Only an admin
-- can change a role or mark a teacher as verified. Reputation is not editable
-- from the app yet; later steps will add points from the database.
--
-- The screens also hide buttons, but these rules are what actually stop a
-- student from promoting themselves.

create schema if not exists private;

-- The private schema is for helpers. It is not part of the public API, so the
-- app cannot call these functions as if they were pages.
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role, supabase_auth_admin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  country text,
  level text,
  years_dancing integer,
  teacher_studio text,
  instagram text,
  reputation integer not null default 0,
  role text not null default 'student',
  is_verified_teacher boolean not null default false,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  constraint profiles_country_length check (country is null or char_length(country) between 2 and 80),
  constraint profiles_level_check check (
    level is null or level in ('beginner', 'intermediate', 'advanced', 'pro')
  ),
  constraint profiles_years_check check (
    years_dancing is null or (years_dancing >= 0 and years_dancing <= 80)
  ),
  constraint profiles_studio_length check (
    teacher_studio is null or char_length(teacher_studio) <= 120
  ),
  constraint profiles_instagram_length check (
    instagram is null or char_length(instagram) <= 30
  ),
  constraint profiles_role_check check (role in ('student', 'teacher', 'admin')),
  constraint profiles_reputation_check check (reputation >= 0)
);

comment on table public.profiles is
  'One row per signed-in person. id matches auth.users.id.';
comment on column public.profiles.role is
  'student, teacher, or admin. Only an admin can change this.';
comment on column public.profiles.is_verified_teacher is
  'Set by an admin after review. Only meaningful when role is teacher.';
comment on column public.profiles.reputation is
  'Starts at 0. Not edited by hand. Later steps add points here.';

create index profiles_role_idx on public.profiles (role);

-- Cloud projects grant new tables to the public API roles automatically.
-- Take that away, then give back only what a signed-in member needs.
revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

alter table public.profiles enable row level security;

-- True when the signed-in person is an admin. security definer so the
-- row-level policies can ask this without reading the table in a loop.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

-- Signed-in members can see profiles. Guests cannot.
create policy "Members can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- A member can save their own profile. A trigger below blocks role changes.
create policy "Members can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- An admin can save any profile, including role and verification.
create policy "Admins can update any profile"
  on public.profiles
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- There is no insert or delete policy on purpose. The signup trigger creates
-- the row. People do not delete profiles from the app.

-- security invoker on purpose: current_user is then the real caller.
-- The app connects as "authenticated". The SQL editor and the database's own
-- point-counting triggers run as "postgres", so they may change these fields.
create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  from_app boolean := current_user in ('authenticated', 'anon');
begin
  -- Reputation is earned through votes and accepted answers, never typed in.
  if from_app and new.reputation is distinct from old.reputation then
    raise exception 'Reputation cannot be edited by hand';
  end if;

  -- A signed-in person can change roles only if they are already an admin.
  -- The founder promotes the very first admin in the SQL editor.
  if from_app and not private.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change roles';
    end if;
    if new.is_verified_teacher is distinct from old.is_verified_teacher then
      raise exception 'Only an admin can verify a teacher';
    end if;
    if new.id is distinct from old.id then
      raise exception 'Profile id cannot change';
    end if;
  end if;

  if new.is_verified_teacher and new.role is distinct from 'teacher' then
    -- Dropping a teacher back to student clears the badge.
    -- Asking to verify a student is a mistake.
    if old.role is distinct from 'teacher' or not old.is_verified_teacher then
      raise exception 'Only a teacher can be verified';
    end if;
    new.is_verified_teacher := false;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.protect_profile_privileges() from public, anon;
grant execute on function private.protect_profile_privileges() to authenticated, service_role;

create trigger profiles_protect_privileges
  before update on public.profiles
  for each row
  execute function private.protect_profile_privileges();

-- Create a student profile when someone signs up with email or Google.
-- Role is always student here, even if the signup form tried to send something else.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_name text;
  chosen_avatar text;
begin
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'New member'
  );

  chosen_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, left(chosen_name, 80), chosen_avatar);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- Emails stay in auth.users. This function is the only way to read them,
-- and it returns rows only for an admin.
create or replace function public.admin_list_members()
returns table (
  id uuid,
  display_name text,
  email text,
  avatar_url text,
  country text,
  level text,
  years_dancing integer,
  teacher_studio text,
  instagram text,
  reputation integer,
  role text,
  is_verified_teacher boolean,
  profile_completed_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    u.email::text,
    p.avatar_url,
    p.country,
    p.level,
    p.years_dancing,
    p.teacher_studio,
    p.instagram,
    p.reputation,
    p.role,
    p.is_verified_teacher,
    p.profile_completed_at,
    p.created_at
  from public.profiles as p
  join auth.users as u on u.id = p.id
  where private.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_list_members() from public, anon;
grant execute on function public.admin_list_members() to authenticated, service_role;
