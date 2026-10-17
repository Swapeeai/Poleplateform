-- Part 3: mini-courses.
--
-- Small, focused courses bought one at a time. Each course has a goal, a level,
-- prerequisite moves, a price, a cover picture and a short trailer. Lessons are
-- ordered; some are free previews. Buyers keep access forever and can tick
-- lessons as done.
--
-- Payment is not connected yet (Stripe needs the founder's go-ahead). Until
-- then an admin grants access by hand. A future payment webhook will add rows
-- to enrollments with source = 'purchase' using the server-only service key.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  goal text not null default '',
  description text not null default '',
  level text not null,
  price_cents integer not null default 0,
  currency text not null default 'EUR',
  cover_image_id uuid references public.media_assets (id) on delete set null,
  trailer_video_id uuid references public.media_assets (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint courses_title_length check (char_length(title) between 3 and 120),
  constraint courses_goal_length check (char_length(goal) <= 500),
  constraint courses_description_length check (char_length(description) <= 6000),
  constraint courses_level_check check (level in ('beginner', 'intermediate', 'advanced', 'pro')),
  constraint courses_price_check check (price_cents >= 0),
  constraint courses_currency_check check (currency in ('EUR', 'USD', 'THB'))
);

create table public.course_prerequisites (
  course_id uuid not null references public.courses (id) on delete cascade,
  move_id uuid not null references public.moves (id) on delete cascade,
  primary key (course_id, move_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position smallint not null,
  title text not null,
  body text not null default '',
  video_id uuid references public.media_assets (id) on delete set null,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, position),
  constraint lessons_title_length check (char_length(title) between 2 and 120),
  constraint lessons_body_length check (char_length(body) <= 20000),
  constraint lessons_position check (position between 1 and 200)
);

create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  source text not null default 'granted',
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id),
  constraint enrollments_source_check check (source in ('purchase', 'granted'))
);

create table public.lesson_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create trigger courses_delete_tags
  after delete on public.courses
  for each row execute function private.delete_content_tags('course');

create trigger courses_touch_updated_at
  before update on public.courses
  for each row execute function private.touch_updated_at();

create or replace function private.is_enrolled(item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments where course_id = item_id and user_id = auth.uid()
  );
$$;

create or replace function private.can_open_lesson(item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_admin() or exists (
    select 1
    from public.lessons as l
    join public.courses as c on c.id = l.course_id
    where l.id = item_id
      and c.is_published
      and (l.is_free_preview or private.is_enrolled(c.id))
  );
$$;

revoke all on function private.is_enrolled(uuid), private.can_open_lesson(uuid) from public, anon;
grant execute on function private.is_enrolled(uuid), private.can_open_lesson(uuid)
  to authenticated, service_role;

-- Media rules again, now with course files:
-- a published course's cover and trailer are open to members;
-- a lesson video opens for buyers, or for everyone if the lesson is a free preview.
create or replace function private.can_view_media(asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.media_assets as m
    where m.id = asset_id
      and auth.uid() is not null
      and (
        m.owner_id = auth.uid()
        or private.is_admin()
        or m.visibility in ('public', 'members')
        or (m.visibility = 'teachers' and private.app_role() in ('teacher', 'admin'))
        or (
          m.visibility = 'course'
          and (
            exists (
              select 1 from public.courses as c
              where c.is_published and (c.cover_image_id = m.id or c.trailer_video_id = m.id)
            )
            or exists (
              select 1 from public.lessons as l
              where l.video_id = m.id and private.can_open_lesson(l.id)
            )
          )
        )
      )
  );
$$;

-- Lesson list for a course page. Titles are visible to everyone who can see
-- the course; the lesson text and video stay locked until bought.
create or replace function public.course_outline(item_id uuid)
returns table (
  id uuid,
  "position" smallint,
  title text,
  is_free_preview boolean,
  has_video boolean,
  is_unlocked boolean,
  is_done boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.position,
    l.title,
    l.is_free_preview,
    l.video_id is not null,
    private.can_open_lesson(l.id),
    exists (select 1 from public.lesson_progress as p where p.lesson_id = l.id and p.user_id = auth.uid())
  from public.lessons as l
  join public.courses as c on c.id = l.course_id
  where l.course_id = item_id
    and auth.uid() is not null
    and (c.is_published or private.is_admin())
  order by l.position;
$$;

revoke all on function public.course_outline(uuid) from public, anon;
grant execute on function public.course_outline(uuid) to authenticated, service_role;

-- Admin view of who has access, with emails (which only live in auth.users).
create or replace function public.admin_course_students(item_id uuid)
returns table (user_id uuid, display_name text, email text, source text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.user_id, p.display_name, u.email::text, e.source, e.created_at
  from public.enrollments as e
  join public.profiles as p on p.id = e.user_id
  join auth.users as u on u.id = e.user_id
  where e.course_id = item_id and private.is_admin()
  order by e.created_at desc;
$$;

-- Admin grants access by email.
create or replace function public.admin_grant_course(item_id uuid, member_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member uuid;
begin
  if not private.is_admin() then
    raise exception 'Only an admin can give course access';
  end if;
  select id into member from auth.users where lower(email) = lower(trim(member_email));
  if member is null then
    raise exception 'No member has that email';
  end if;
  insert into public.enrollments (user_id, course_id, source, granted_by)
  values (member, item_id, 'granted', auth.uid())
  on conflict (user_id, course_id) do nothing;
end;
$$;

revoke all on function public.admin_course_students(uuid), public.admin_grant_course(uuid, text)
  from public, anon;
grant execute on function public.admin_course_students(uuid), public.admin_grant_course(uuid, text)
  to authenticated, service_role;

-- Permissions
revoke all on table public.courses, public.course_prerequisites, public.lessons,
  public.enrollments, public.lesson_progress from anon, authenticated;
grant select, insert, update, delete on table public.courses, public.course_prerequisites,
  public.lessons, public.enrollments, public.lesson_progress to authenticated;
grant all on table public.courses, public.course_prerequisites, public.lessons,
  public.enrollments, public.lesson_progress to service_role;

alter table public.courses enable row level security;
alter table public.course_prerequisites enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

create policy "Members see published courses" on public.courses for select to authenticated
  using (is_published or private.is_admin());
create policy "Admins write courses" on public.courses for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read course prerequisites" on public.course_prerequisites
  for select to authenticated using (true);
create policy "Admins write course prerequisites" on public.course_prerequisites
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "Buyers and previews open lessons" on public.lessons for select to authenticated
  using (private.can_open_lesson(id));
create policy "Admins write lessons" on public.lessons for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members see their own access" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or private.is_admin());
create policy "Admins manage access" on public.enrollments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members track their own progress" on public.lesson_progress for select to authenticated
  using (user_id = auth.uid());
create policy "Members tick lessons they can open" on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and private.can_open_lesson(lesson_id));
create policy "Members untick their own lessons" on public.lesson_progress for delete to authenticated
  using (user_id = auth.uid());
