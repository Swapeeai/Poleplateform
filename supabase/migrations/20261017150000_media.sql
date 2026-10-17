-- Videos and pictures.
--
-- Files live in a private Supabase Storage bucket called "media". There are no
-- public links. The app asks for a short-lived signed link, and Storage only
-- gives one if the rules below say this person may see the file.
--
-- Every file has a row in media_assets saying who owns it and who may see it:
--   public   - any signed-in member (everyone is signed in, so same as members today)
--   members  - any signed-in member (the default)
--   teachers - teachers and admins, plus the owner
--   course   - people who bought the course it belongs to (admin uploads only)

-- The signed-in person's role, or null. Used by many rules below.
create or replace function private.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function private.app_role() from public, anon;
grant execute on function private.app_role() to authenticated, service_role;

-- 200 MB per file. The Supabase free plan caps uploads at 50 MB whatever this says.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  209715200,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  storage_path text not null unique,
  visibility text not null default 'members',
  duration_seconds numeric(6, 1),
  mute_audio boolean not null default false,
  created_at timestamptz not null default now(),
  constraint media_kind_check check (kind in ('video', 'image')),
  constraint media_visibility_check check (visibility in ('public', 'members', 'teachers', 'course')),
  constraint media_duration_check check (duration_seconds is null or duration_seconds > 0),
  -- Files must sit in the owner's own folder: <owner id>/<file name>.
  constraint media_path_in_owner_folder check (storage_path like owner_id::text || '/%')
);

comment on table public.media_assets is
  'One row per uploaded video or picture. The file itself is in Storage.';
comment on column public.media_assets.mute_audio is
  'The player keeps this video silent. The sound is still in the file until a video service strips it.';

create index media_assets_owner_idx on public.media_assets (owner_id);

-- Course access is added by the courses migration, which replaces this function.
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
      )
  );
$$;

create or replace function private.can_view_media_path(path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select private.can_view_media(m.id) from public.media_assets as m where m.storage_path = path),
    false
  );
$$;

revoke all on function private.can_view_media(uuid) from public, anon;
revoke all on function private.can_view_media_path(text) from public, anon;
grant execute on function private.can_view_media(uuid) to authenticated, service_role;
grant execute on function private.can_view_media_path(text) to authenticated, service_role;

-- Used by questions, answers, combos and challenges: the clip must belong to
-- the person posting it, be a video, and be no longer than the limit.
create or replace function private.assert_clip(clip_id uuid, poster_id uuid, max_seconds integer)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clip public.media_assets%rowtype;
begin
  if clip_id is null then
    return;
  end if;
  select * into clip from public.media_assets where id = clip_id;
  if not found then
    raise exception 'Video not found';
  end if;
  if clip.owner_id is distinct from poster_id then
    raise exception 'You can only post your own video';
  end if;
  if clip.kind <> 'video' then
    raise exception 'That file is not a video';
  end if;
  if clip.duration_seconds is null or clip.duration_seconds > max_seconds then
    raise exception 'Video is longer than % seconds', max_seconds;
  end if;
end;
$$;

revoke all on function private.assert_clip(uuid, uuid, integer) from public, anon;
grant execute on function private.assert_clip(uuid, uuid, integer) to authenticated, service_role;

revoke all on table public.media_assets from anon, authenticated;
grant select, insert, update, delete on table public.media_assets to authenticated;
grant all on table public.media_assets to service_role;

alter table public.media_assets enable row level security;

create policy "Members see media they are allowed to see"
  on public.media_assets for select to authenticated
  using (private.can_view_media(id));

create policy "Members register their own uploads"
  on public.media_assets for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (visibility <> 'course' or private.is_admin())
  );

create policy "Owners and admins change visibility"
  on public.media_assets for update to authenticated
  using (owner_id = auth.uid() or private.is_admin())
  with check (
    (owner_id = auth.uid() or private.is_admin())
    and (visibility <> 'course' or private.is_admin())
  );

create policy "Owners and admins delete media"
  on public.media_assets for delete to authenticated
  using (owner_id = auth.uid() or private.is_admin());

-- Storage rules. Uploads go to the person's own folder. Reading a file
-- (which is what creating a signed link needs) follows media_assets.
create policy "Members upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members read media they may see"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and private.can_view_media_path(name));

create policy "Owners and admins delete files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin())
  );
