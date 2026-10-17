-- Part 2: playing with moves.
--
-- Combos: an ordered list of moves, with optional transition notes and a video.
-- Weekly challenges: the admin picks moves and dates; members post one video
-- entry each while the challenge is open; members vote; the admin features
-- favourites. Past challenges stay visible as an archive.
-- Class plans: teachers build plans (warm-up, conditioning, moves, combo,
-- cool-down) for themselves. The admin can publish a suggested plan for everyone.

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  notes text not null default '',
  video_id uuid references public.media_assets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combos_title_length check (char_length(title) between 2 and 120),
  constraint combos_notes_length check (char_length(notes) <= 2000)
);

create table public.combo_moves (
  combo_id uuid not null references public.combos (id) on delete cascade,
  position smallint not null,
  move_id uuid not null references public.moves (id) on delete cascade,
  transition_note text not null default '',
  primary key (combo_id, position),
  constraint combo_moves_position check (position between 1 and 30),
  constraint combo_moves_note_length check (char_length(transition_note) <= 300)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rules text not null default '',
  level text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_ordered boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint challenges_title_length check (char_length(title) between 3 and 120),
  constraint challenges_rules_length check (char_length(rules) <= 4000),
  constraint challenges_level_check check (level in ('beginner', 'intermediate', 'advanced', 'pro')),
  constraint challenges_dates check (ends_at > starts_at)
);

create table public.challenge_moves (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  position smallint not null,
  move_id uuid not null references public.moves (id) on delete cascade,
  primary key (challenge_id, position),
  constraint challenge_moves_position check (position between 1 and 30)
);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  video_id uuid not null references public.media_assets (id) on delete restrict,
  note text not null default '',
  is_featured boolean not null default false,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id),
  constraint challenge_entries_note_length check (char_length(note) <= 500)
);

create table public.class_plans (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  notes text not null default '',
  is_suggested boolean not null default false,
  week_of date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_plans_title_length check (char_length(title) between 2 and 120),
  constraint class_plans_notes_length check (char_length(notes) <= 4000)
);

create table public.class_plan_items (
  plan_id uuid not null references public.class_plans (id) on delete cascade,
  position smallint not null,
  section text not null,
  move_id uuid references public.moves (id) on delete set null,
  combo_id uuid references public.combos (id) on delete set null,
  exercise_id uuid references public.conditioning_exercises (id) on delete set null,
  note text not null default '',
  primary key (plan_id, position),
  constraint class_plan_items_position check (position between 1 and 60),
  constraint class_plan_items_section check (
    section in ('warm_up', 'conditioning', 'moves', 'combo', 'cool_down')
  ),
  constraint class_plan_items_note_length check (char_length(note) <= 300),
  constraint class_plan_items_not_empty check (
    move_id is not null or combo_id is not null or exercise_id is not null or note <> ''
  )
);

create index combos_created_idx on public.combos (created_at desc);
create index combo_moves_move_idx on public.combo_moves (move_id);
create index challenges_dates_idx on public.challenges (starts_at desc);
create index challenge_moves_move_idx on public.challenge_moves (move_id);
create index challenge_entries_challenge_idx on public.challenge_entries (challenge_id, score desc);

create trigger combos_delete_tags
  after delete on public.combos
  for each row execute function private.delete_content_tags('combo');

create trigger challenges_delete_tags
  after delete on public.challenges
  for each row execute function private.delete_content_tags('challenge');

create trigger combos_touch_updated_at
  before update on public.combos
  for each row execute function private.touch_updated_at();

create trigger class_plans_touch_updated_at
  before update on public.class_plans
  for each row execute function private.touch_updated_at();

create or replace function private.check_combo()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.author_id is distinct from old.author_id
     and current_user in ('authenticated', 'anon') then
    raise exception 'The author cannot change';
  end if;
  if new.video_id is distinct from (case when tg_op = 'UPDATE' then old.video_id end) then
    perform private.assert_clip(new.video_id, new.author_id, 180);
  end if;
  return new;
end;
$$;

create trigger combos_check
  before insert or update on public.combos
  for each row execute function private.check_combo();

-- Entries: only while the challenge is open, own video up to 3 minutes.
-- Only an admin can feature an entry. Scores come from votes.
create or replace function private.check_challenge_entry()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  from_app boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.challenges
      where id = new.challenge_id and now() between starts_at and ends_at
    ) then
      raise exception 'This challenge is not open';
    end if;
    perform private.assert_clip(new.video_id, new.user_id, 180);
    if from_app then
      new.score := 0;
      new.is_featured := false;
    end if;
    return new;
  end if;

  if from_app then
    if new.user_id is distinct from old.user_id or new.challenge_id is distinct from old.challenge_id
       or new.video_id is distinct from old.video_id then
      raise exception 'An entry cannot move';
    end if;
    if new.score is distinct from old.score then
      raise exception 'Scores are counted by the database';
    end if;
    if new.is_featured is distinct from old.is_featured and not private.is_admin() then
      raise exception 'Only an admin can feature an entry';
    end if;
  end if;
  return new;
end;
$$;

create trigger challenge_entries_check
  before insert or update on public.challenge_entries
  for each row execute function private.check_challenge_entry();

create or replace function private.owns_combo(item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.combos where id = item_id and author_id = auth.uid())
    or private.is_admin();
$$;

create or replace function private.can_read_plan(item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_plans
    where id = item_id and (author_id = auth.uid() or is_suggested)
  ) or private.is_admin();
$$;

create or replace function private.owns_plan(item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.class_plans where id = item_id and author_id = auth.uid())
    or private.is_admin();
$$;

revoke all on function private.owns_combo(uuid), private.can_read_plan(uuid), private.owns_plan(uuid)
  from public, anon;
grant execute on function private.owns_combo(uuid), private.can_read_plan(uuid), private.owns_plan(uuid)
  to authenticated, service_role;

-- Permissions
revoke all on table public.combos, public.combo_moves, public.challenges, public.challenge_moves,
  public.challenge_entries, public.class_plans, public.class_plan_items from anon, authenticated;
grant select, insert, update, delete on table public.combos, public.combo_moves, public.challenges,
  public.challenge_moves, public.challenge_entries, public.class_plans, public.class_plan_items
  to authenticated;
grant all on table public.combos, public.combo_moves, public.challenges, public.challenge_moves,
  public.challenge_entries, public.class_plans, public.class_plan_items to service_role;

alter table public.combos enable row level security;
alter table public.combo_moves enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_moves enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.class_plans enable row level security;
alter table public.class_plan_items enable row level security;

create policy "Members read combos" on public.combos for select to authenticated using (true);
create policy "Members create combos as themselves" on public.combos for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors and admins edit combos" on public.combos for update to authenticated
  using (author_id = auth.uid() or private.is_admin())
  with check (author_id = auth.uid() or private.is_admin());
create policy "Authors and admins delete combos" on public.combos for delete to authenticated
  using (author_id = auth.uid() or private.is_admin());

create policy "Members read combo moves" on public.combo_moves for select to authenticated using (true);
create policy "Combo authors write combo moves" on public.combo_moves for all to authenticated
  using (private.owns_combo(combo_id)) with check (private.owns_combo(combo_id));

create policy "Members read challenges" on public.challenges for select to authenticated using (true);
create policy "Admins write challenges" on public.challenges for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read challenge moves" on public.challenge_moves for select to authenticated using (true);
create policy "Admins write challenge moves" on public.challenge_moves for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read entries" on public.challenge_entries for select to authenticated using (true);
create policy "Members enter as themselves" on public.challenge_entries for insert to authenticated
  with check (user_id = auth.uid());
create policy "Entrants and admins edit entries" on public.challenge_entries for update to authenticated
  using (user_id = auth.uid() or private.is_admin())
  with check (user_id = auth.uid() or private.is_admin());
create policy "Entrants and admins delete entries" on public.challenge_entries for delete to authenticated
  using (user_id = auth.uid() or private.is_admin());

create policy "Teachers see their plans, everyone sees suggested plans" on public.class_plans
  for select to authenticated
  using (author_id = auth.uid() or is_suggested or private.is_admin());
create policy "Teachers create plans" on public.class_plans for insert to authenticated
  with check (
    author_id = auth.uid()
    and private.app_role() in ('teacher', 'admin')
    and (not is_suggested or private.is_admin())
  );
create policy "Authors and admins edit plans" on public.class_plans for update to authenticated
  using (author_id = auth.uid() or private.is_admin())
  with check (
    (author_id = auth.uid() and private.app_role() in ('teacher', 'admin') and (not is_suggested or private.is_admin()))
    or private.is_admin()
  );
create policy "Authors and admins delete plans" on public.class_plans for delete to authenticated
  using (author_id = auth.uid() or private.is_admin());

create policy "Plan readers read items" on public.class_plan_items for select to authenticated
  using (private.can_read_plan(plan_id));
create policy "Plan authors write items" on public.class_plan_items for all to authenticated
  using (private.owns_plan(plan_id)) with check (private.owns_plan(plan_id));
