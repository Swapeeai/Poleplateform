-- Part 1: Ask the Pole.
--
-- A dancer posts a question with one video (up to 90 seconds). Anyone signed in
-- answers. Teachers can label their answer as technique and/or conditioning.
-- People vote. The asker marks the answer that helped. Short comments sit
-- under answers. Anyone can report anything; admins see the reports.
--
-- Points (reputation), counted by the database:
--   upvote on your question  +5      upvote on your answer  +10
--   downvote on either       -2      your answer accepted   +15
-- Reputation never goes below 0.

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  tried text not null default '',
  level text not null,
  video_id uuid not null references public.media_assets (id) on delete restrict,
  accepted_answer_id uuid,
  success_video_id uuid references public.media_assets (id) on delete set null,
  score integer not null default 0,
  answer_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_title_length check (char_length(title) between 5 and 140),
  constraint questions_body_length check (char_length(body) <= 4000),
  constraint questions_tried_length check (char_length(tried) <= 2000),
  constraint questions_level_check check (level in ('beginner', 'intermediate', 'advanced', 'pro'))
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null,
  video_id uuid references public.media_assets (id) on delete set null,
  is_technique boolean not null default false,
  is_conditioning boolean not null default false,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answers_body_length check (char_length(body) between 1 and 4000)
);

alter table public.questions
  add constraint questions_accepted_answer_fk
  foreign key (accepted_answer_id) references public.answers (id) on delete set null;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (char_length(body) between 1 and 1000)
);

create table public.votes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  value smallint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id),
  constraint votes_type_check check (target_type in ('question', 'answer', 'challenge_entry')),
  constraint votes_value_check check (value in (-1, 1))
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id),
  constraint reports_type_check check (
    target_type in ('question', 'answer', 'comment', 'combo', 'challenge_entry', 'media')
  ),
  constraint reports_reason_length check (char_length(reason) between 3 and 500),
  constraint reports_status_check check (status in ('open', 'resolved', 'dismissed'))
);

create index questions_created_idx on public.questions (created_at desc);
create index answers_question_idx on public.answers (question_id);
create index comments_answer_idx on public.comments (answer_id);
create index reports_status_idx on public.reports (status, created_at desc);

create trigger questions_delete_tags
  after delete on public.questions
  for each row execute function private.delete_content_tags('question');

-- Who wrote a thing. plpgsql so it can name challenge_entries, created later.
create or replace function private.target_author(kind text, item_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  author uuid;
begin
  if kind = 'question' then
    select author_id into author from public.questions where id = item_id;
  elsif kind = 'answer' then
    select author_id into author from public.answers where id = item_id;
  elsif kind = 'challenge_entry' then
    select user_id into author from public.challenge_entries where id = item_id;
  end if;
  return author;
end;
$$;

revoke all on function private.target_author(text, uuid) from public, anon;
grant execute on function private.target_author(text, uuid) to authenticated, service_role;

-- Adds points to a member. Runs as the database owner, which the profile
-- protection trigger allows.
create or replace function private.add_reputation(member_id uuid, points integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set reputation = greatest(0, reputation + points)
  where id = member_id and points <> 0;
$$;

revoke all on function private.add_reputation(uuid, integer) from public, anon, authenticated;

-- Question rules: the video, who may accept an answer, and counters.
create or replace function private.check_question()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  from_app boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    perform private.assert_clip(new.video_id, new.author_id, 90);
    if from_app then
      new.score := 0;
      new.answer_count := 0;
      new.accepted_answer_id := null;
      new.success_video_id := null;
    end if;
    return new;
  end if;

  if from_app then
    if new.author_id is distinct from old.author_id then
      raise exception 'The author cannot change';
    end if;
    if new.score is distinct from old.score or new.answer_count is distinct from old.answer_count then
      raise exception 'Scores are counted by the database';
    end if;
    if new.video_id is distinct from old.video_id then
      perform private.assert_clip(new.video_id, old.author_id, 90);
    end if;
    if new.accepted_answer_id is distinct from old.accepted_answer_id
       and auth.uid() is distinct from old.author_id then
      raise exception 'Only the person who asked can mark the answer that helped';
    end if;
    if new.success_video_id is distinct from old.success_video_id then
      if auth.uid() is distinct from old.author_id then
        raise exception 'Only the person who asked can add a success video';
      end if;
      perform private.assert_clip(new.success_video_id, old.author_id, 90);
    end if;
  end if;

  if new.accepted_answer_id is not null
     and not exists (
       select 1 from public.answers where id = new.accepted_answer_id and question_id = new.id
     ) then
    raise exception 'That answer belongs to another question';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger questions_check
  before insert or update on public.questions
  for each row execute function private.check_question();

-- Accepted answer points: +15 to the new answer's author, taken back from the old one.
create or replace function private.reward_accepted_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_author uuid;
  new_author uuid;
begin
  if new.accepted_answer_id is not distinct from old.accepted_answer_id then
    return new;
  end if;
  select author_id into old_author from public.answers where id = old.accepted_answer_id;
  select author_id into new_author from public.answers where id = new.accepted_answer_id;
  if old_author is not null and old_author <> new.author_id then
    perform private.add_reputation(old_author, -15);
  end if;
  if new_author is not null and new_author <> new.author_id then
    perform private.add_reputation(new_author, 15);
  end if;
  return new;
end;
$$;

create trigger questions_reward_accepted
  after update of accepted_answer_id on public.questions
  for each row execute function private.reward_accepted_answer();

-- Answer rules: only teachers (and admins) can label technique / conditioning.
create or replace function private.check_answer()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  from_app boolean := current_user in ('authenticated', 'anon');
  author_role text;
begin
  if from_app and tg_op = 'UPDATE' then
    if new.author_id is distinct from old.author_id or new.question_id is distinct from old.question_id then
      raise exception 'An answer cannot move';
    end if;
    if new.score is distinct from old.score then
      raise exception 'Scores are counted by the database';
    end if;
  end if;
  if from_app and tg_op = 'INSERT' then
    new.score := 0;
  end if;

  if new.video_id is distinct from (case when tg_op = 'UPDATE' then old.video_id end) then
    perform private.assert_clip(new.video_id, new.author_id, 90);
  end if;

  select role into author_role from public.profiles where id = new.author_id;
  if (new.is_technique or new.is_conditioning) and author_role not in ('teacher', 'admin') then
    raise exception 'Only teachers can label an answer as technique or conditioning';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger answers_check
  before insert or update on public.answers
  for each row execute function private.check_answer();

create or replace function private.count_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.questions set answer_count = answer_count + 1 where id = new.question_id;
    return new;
  end if;
  update public.questions set answer_count = greatest(0, answer_count - 1) where id = old.question_id;
  return old;
end;
$$;

create trigger answers_count
  after insert or delete on public.answers
  for each row execute function private.count_answers();

-- Votes: no voting on your own post. Scores and points follow every change.
create or replace function private.check_vote()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if private.target_author(new.target_type, new.target_id) is null then
    raise exception 'Nothing to vote on';
  end if;
  if private.target_author(new.target_type, new.target_id) = new.user_id then
    raise exception 'You cannot vote on your own post';
  end if;
  return new;
end;
$$;

create trigger votes_check
  before insert or update on public.votes
  for each row execute function private.check_vote();

create or replace function private.apply_vote(kind text, item_id uuid, delta integer, rep integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if kind = 'question' then
    update public.questions set score = score + delta where id = item_id;
  elsif kind = 'answer' then
    update public.answers set score = score + delta where id = item_id;
  elsif kind = 'challenge_entry' then
    update public.challenge_entries set score = score + delta where id = item_id;
  end if;
  if kind in ('question', 'answer') and rep <> 0 then
    perform private.add_reputation(private.target_author(kind, item_id), rep);
  end if;
end;
$$;

revoke all on function private.apply_vote(text, uuid, integer, integer) from public, anon, authenticated;

create or replace function private.vote_points(kind text, value integer)
returns integer
language sql
immutable
as $$
  select case
    when value < 0 then -2
    when kind = 'question' then 5
    when kind = 'answer' then 10
    else 0
  end;
$$;

create or replace function private.tally_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.apply_vote(old.target_type, old.target_id, -old.value,
      -private.vote_points(old.target_type, old.value));
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.apply_vote(new.target_type, new.target_id, new.value,
      private.vote_points(new.target_type, new.value));
    return new;
  end if;
  return old;
end;
$$;

create trigger votes_tally
  after insert or update or delete on public.votes
  for each row execute function private.tally_vote();

-- Permissions
revoke all on table public.questions, public.answers, public.comments, public.votes, public.reports
  from anon, authenticated;
grant select, insert, update, delete on table public.questions, public.answers, public.comments,
  public.votes, public.reports to authenticated;
grant all on table public.questions, public.answers, public.comments, public.votes, public.reports
  to service_role;

alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;

create policy "Members read questions" on public.questions for select to authenticated using (true);
create policy "Members ask as themselves" on public.questions for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors and admins edit questions" on public.questions for update to authenticated
  using (author_id = auth.uid() or private.is_admin())
  with check (author_id = auth.uid() or private.is_admin());
create policy "Authors and admins delete questions" on public.questions for delete to authenticated
  using (author_id = auth.uid() or private.is_admin());

create policy "Members read answers" on public.answers for select to authenticated using (true);
create policy "Members answer as themselves" on public.answers for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors and admins edit answers" on public.answers for update to authenticated
  using (author_id = auth.uid() or private.is_admin())
  with check (author_id = auth.uid() or private.is_admin());
create policy "Authors and admins delete answers" on public.answers for delete to authenticated
  using (author_id = auth.uid() or private.is_admin());

create policy "Members read comments" on public.comments for select to authenticated using (true);
create policy "Members comment as themselves" on public.comments for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors and admins delete comments" on public.comments for delete to authenticated
  using (author_id = auth.uid() or private.is_admin());

create policy "Members see their own votes" on public.votes for select to authenticated
  using (user_id = auth.uid());
create policy "Members vote as themselves" on public.votes for insert to authenticated
  with check (user_id = auth.uid());
create policy "Members change their own votes" on public.votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Members remove their own votes" on public.votes for delete to authenticated
  using (user_id = auth.uid());

create policy "Members report as themselves" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy "Reporters and admins read reports" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or private.is_admin());
create policy "Admins handle reports" on public.reports for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
