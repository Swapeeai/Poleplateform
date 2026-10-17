-- Part 2 foundation: the move dictionary.
--
-- Everything else (questions, combos, challenges, courses) is tagged with
-- moves, so a move page can list everything related to it.
-- Only an admin edits the dictionary. Every member can read it and save moves
-- to a personal list ("working on" / "got it").

create table public.moves (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  level text not null,
  pole_type text not null default 'both',
  description text not null default '',
  common_mistakes text not null default '',
  safety_notes text not null default '',
  demo_video_id uuid references public.media_assets (id) on delete set null,
  image_id uuid references public.media_assets (id) on delete set null,
  -- A variation points at its base move. Base moves leave this empty.
  base_move_id uuid references public.moves (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moves_name_length check (char_length(name) between 1 and 80),
  constraint moves_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint moves_category_check check (
    category in ('spin', 'climb', 'hold', 'invert', 'transition', 'floorwork', 'flexibility', 'other')
  ),
  constraint moves_level_check check (level in ('beginner', 'intermediate', 'advanced', 'pro')),
  constraint moves_pole_type_check check (pole_type in ('static', 'spin', 'both')),
  constraint moves_not_own_base check (base_move_id is null or base_move_id <> id)
);

create index moves_base_idx on public.moves (base_move_id);

-- Pole moves have many names across studios and countries. Search matches these too.
create table public.move_aliases (
  move_id uuid not null references public.moves (id) on delete cascade,
  alias text not null,
  primary key (move_id, alias),
  constraint move_aliases_length check (char_length(alias) between 1 and 80)
);

create index move_aliases_lower_idx on public.move_aliases (lower(alias));

create table public.move_prerequisites (
  move_id uuid not null references public.moves (id) on delete cascade,
  prerequisite_move_id uuid not null references public.moves (id) on delete cascade,
  primary key (move_id, prerequisite_move_id),
  constraint move_prerequisites_not_self check (move_id <> prerequisite_move_id)
);

create table public.conditioning_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  constraint conditioning_name_length check (char_length(name) between 1 and 80)
);

create table public.move_conditioning (
  move_id uuid not null references public.moves (id) on delete cascade,
  exercise_id uuid not null references public.conditioning_exercises (id) on delete cascade,
  primary key (move_id, exercise_id)
);

create table public.saved_moves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  move_id uuid not null references public.moves (id) on delete cascade,
  status text not null default 'working_on',
  updated_at timestamptz not null default now(),
  primary key (user_id, move_id),
  constraint saved_moves_status_check check (status in ('working_on', 'got_it'))
);

-- Links a question, combo, challenge or course to the moves it is about.
create table public.content_tags (
  target_type text not null,
  target_id uuid not null,
  move_id uuid not null references public.moves (id) on delete cascade,
  primary key (target_type, target_id, move_id),
  constraint content_tags_type_check check (target_type in ('question', 'combo', 'challenge', 'course'))
);

create index content_tags_move_idx on public.content_tags (move_id);

-- Who may tag a thing: its author, or an admin. Challenges and courses are admin-only.
-- plpgsql so it can name tables that later migrations create.
create or replace function private.can_tag(kind text, item_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if private.is_admin() then
    return true;
  end if;
  if kind = 'question' then
    return exists (select 1 from public.questions where id = item_id and author_id = auth.uid());
  elsif kind = 'combo' then
    return exists (select 1 from public.combos where id = item_id and author_id = auth.uid());
  end if;
  return false;
end;
$$;

revoke all on function private.can_tag(text, uuid) from public, anon;
grant execute on function private.can_tag(text, uuid) to authenticated, service_role;

-- Removes tags when the tagged thing is deleted. Each table passes its type.
create or replace function private.delete_content_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.content_tags where target_type = tg_argv[0] and target_id = old.id;
  return old;
end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger moves_touch_updated_at
  before update on public.moves
  for each row execute function private.touch_updated_at();

-- Search by name or any alias. Empty search returns every move.
create or replace function public.search_moves(query text)
returns setof public.moves
language sql
stable
security invoker
set search_path = public
as $$
  with pattern as (
    select '%' || replace(replace(replace(coalesce(trim(query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as p
  )
  select m.*
  from public.moves as m
  where coalesce(trim(query), '') = ''
     or m.name ilike (select p from pattern)
     or exists (
       select 1 from public.move_aliases as a
       where a.move_id = m.id and a.alias ilike (select p from pattern)
     )
  order by m.name;
$$;

revoke all on function public.search_moves(text) from public, anon;
grant execute on function public.search_moves(text) to authenticated, service_role;

-- Permissions: members read, admins write. Saved moves are private to their owner.
revoke all on table public.moves, public.move_aliases, public.move_prerequisites,
  public.conditioning_exercises, public.move_conditioning, public.saved_moves,
  public.content_tags from anon, authenticated;

grant select, insert, update, delete on table public.moves, public.move_aliases,
  public.move_prerequisites, public.conditioning_exercises, public.move_conditioning,
  public.saved_moves, public.content_tags to authenticated;

grant all on table public.moves, public.move_aliases, public.move_prerequisites,
  public.conditioning_exercises, public.move_conditioning, public.saved_moves,
  public.content_tags to service_role;

alter table public.moves enable row level security;
alter table public.move_aliases enable row level security;
alter table public.move_prerequisites enable row level security;
alter table public.conditioning_exercises enable row level security;
alter table public.move_conditioning enable row level security;
alter table public.saved_moves enable row level security;
alter table public.content_tags enable row level security;

create policy "Members read moves" on public.moves for select to authenticated using (true);
create policy "Admins write moves" on public.moves for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read aliases" on public.move_aliases for select to authenticated using (true);
create policy "Admins write aliases" on public.move_aliases for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read prerequisites" on public.move_prerequisites for select to authenticated using (true);
create policy "Admins write prerequisites" on public.move_prerequisites for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read exercises" on public.conditioning_exercises for select to authenticated using (true);
create policy "Admins write exercises" on public.conditioning_exercises for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members read move conditioning" on public.move_conditioning for select to authenticated using (true);
create policy "Admins write move conditioning" on public.move_conditioning for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy "Members manage their saved moves" on public.saved_moves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Members read tags" on public.content_tags for select to authenticated using (true);
create policy "Authors and admins add tags" on public.content_tags for insert to authenticated
  with check (private.can_tag(target_type, target_id));
create policy "Authors and admins remove tags" on public.content_tags for delete to authenticated
  using (private.can_tag(target_type, target_id));
