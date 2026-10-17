-- Checks the database rules with four pretend people. Run with supabase/tests/run.sh.
-- Every check that should be refused must raise an error; anything else stops the run.

\set ON_ERROR_STOP on

create schema test;
grant usage on schema test to authenticated;

create function test.expect_error(statement text, fragment text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(lower(fragment) in lower(sqlerrm)) = 0 then
      raise exception 'Wrong error for [%]: got "%" expected "%"', statement, sqlerrm, fragment;
    end if;
    return;
  end;
  raise exception 'Expected an error for: %', statement;
end $$;

create function test.expect_equal(actual text, expected text, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception '% : got %, expected %', label, actual, expected;
  end if;
end $$;

grant execute on all functions in schema test to authenticated;

create function test.as_member(member uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', member::text, false);
end $$;

-- People: admin, teacher, two students.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'admin@test.local', '{"display_name":"Ada Admin"}'),
  ('00000000-0000-4000-8000-00000000000b', 'teacher@test.local', '{"full_name":"Tia Teacher"}'),
  ('00000000-0000-4000-8000-00000000000c', 's1@test.local', '{}'),
  ('00000000-0000-4000-8000-00000000000d', 's2@test.local', '{"role":"admin"}');

select test.expect_equal((select role from public.profiles where id = '00000000-0000-4000-8000-00000000000d'),
  'student', 'signup cannot choose a role');
select test.expect_equal((select display_name from public.profiles where id = '00000000-0000-4000-8000-00000000000c'),
  's1', 'display name falls back to the email');

-- The founder promotes people in the SQL editor (runs as postgres).
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000a';
update public.profiles set role = 'teacher', is_verified_teacher = true where id = '00000000-0000-4000-8000-00000000000b';

\ir ../seed.sql
select test.expect_equal((select count(*)::text from public.moves), '24', 'seed moves');

-- ===== Profiles =====
select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
select test.expect_error($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'only an admin can change roles');
select test.expect_error($$update public.profiles set reputation = 99 where id = auth.uid()$$, 'reputation cannot be edited');
select test.expect_error($$update public.profiles set is_verified_teacher = true where id = auth.uid()$$, 'only an admin');
update public.profiles set display_name = 'Sam Student' where id = auth.uid();
select test.expect_equal((select count(*)::text from public.profiles where id = '00000000-0000-4000-8000-00000000000d'
  and display_name = 'hacked'), '0', 'cannot edit others');
update public.profiles set display_name = 'hacked' where id = '00000000-0000-4000-8000-00000000000d';
select test.expect_equal((select display_name from public.profiles where id = '00000000-0000-4000-8000-00000000000d'),
  's2', 'update on someone else changes nothing');
reset role;

-- ===== Media =====
select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
insert into public.media_assets (id, owner_id, kind, storage_path, visibility, duration_seconds)
values ('10000000-0000-4000-8000-000000000001', auth.uid(), 'video', '00000000-0000-4000-8000-00000000000c/q.mp4', 'members', 30);
insert into public.media_assets (id, owner_id, kind, storage_path, visibility, duration_seconds)
values ('10000000-0000-4000-8000-000000000002', auth.uid(), 'video', '00000000-0000-4000-8000-00000000000c/long.mp4', 'members', 120);
insert into public.media_assets (id, owner_id, kind, storage_path, visibility, duration_seconds)
values ('10000000-0000-4000-8000-000000000003', auth.uid(), 'video', '00000000-0000-4000-8000-00000000000c/private.mp4', 'teachers', 20);
-- The upload field inserts and reads the new id back in one step.
do $$
declare new_id uuid;
begin
  insert into public.media_assets (owner_id, kind, storage_path, visibility, duration_seconds)
  values (auth.uid(), 'video', '00000000-0000-4000-8000-00000000000c/returning.mp4', 'teachers', 5)
  returning id into new_id;
  if new_id is null then raise exception 'FAIL: uploader could not read back their new media row'; end if;
  raise notice 'ok: uploader reads back the new media row';
end $$;
select test.expect_error($$insert into public.media_assets (owner_id, kind, storage_path, duration_seconds)
  values (auth.uid(), 'video', '00000000-0000-4000-8000-00000000000d/x.mp4', 10)$$, 'media_path_in_owner_folder');
select test.expect_error($$insert into public.media_assets (owner_id, kind, storage_path, visibility, duration_seconds)
  values (auth.uid(), 'video', '00000000-0000-4000-8000-00000000000c/c.mp4', 'course', 10)$$, 'row-level security');
insert into storage.objects (bucket_id, name) values ('media', '00000000-0000-4000-8000-00000000000c/private.mp4');
select test.expect_error($$insert into storage.objects (bucket_id, name) values ('media', '00000000-0000-4000-8000-00000000000d/x.mp4')$$,
  'row-level security');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000d');
set role authenticated;
select test.expect_equal((select count(*)::text from storage.objects), '0', 'student cannot open teachers-only file');
select test.expect_equal((select count(*)::text from public.media_assets
  where id = '10000000-0000-4000-8000-000000000003'), '0', 'student cannot see teachers-only row');
insert into public.media_assets (id, owner_id, kind, storage_path, duration_seconds)
values ('10000000-0000-4000-8000-000000000004', auth.uid(), 'video', '00000000-0000-4000-8000-00000000000d/a.mp4', 20);
insert into public.media_assets (id, owner_id, kind, storage_path, duration_seconds)
values ('10000000-0000-4000-8000-000000000006', auth.uid(), 'video', '00000000-0000-4000-8000-00000000000d/entry.mp4', 40);
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000b');
set role authenticated;
select test.expect_equal((select count(*)::text from storage.objects), '1', 'teacher opens teachers-only file');
reset role;

-- ===== Ask the Pole =====
select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
insert into public.questions (id, author_id, title, level, video_id)
values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'My invert keeps failing', 'beginner',
  '10000000-0000-4000-8000-000000000001');
select test.expect_error($$insert into public.questions (author_id, title, level, video_id)
  values (auth.uid(), 'Too long video', 'beginner', '10000000-0000-4000-8000-000000000002')$$, 'longer than 90');
select test.expect_error($$insert into public.questions (author_id, title, level, video_id)
  values (auth.uid(), 'Not my video', 'beginner', '10000000-0000-4000-8000-000000000004')$$, 'own video');
select test.expect_error($$insert into public.questions (author_id, title, level, video_id)
  values ('00000000-0000-4000-8000-00000000000d', 'Pretending', 'beginner', '10000000-0000-4000-8000-000000000001')$$,
  'own video');
insert into public.content_tags (target_type, target_id, move_id)
select 'question', '20000000-0000-4000-8000-000000000001', id from public.moves where slug = 'basic-invert';
select test.expect_error($$update public.questions set score = 100 where id = '20000000-0000-4000-8000-000000000001'$$,
  'counted by the database');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000d');
set role authenticated;
select test.expect_error($$insert into public.answers (question_id, author_id, body, is_technique)
  values ('20000000-0000-4000-8000-000000000001', auth.uid(), 'Try this', true)$$, 'only teachers');
insert into public.answers (id, question_id, author_id, body)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', auth.uid(), 'Engage the core');
insert into public.votes (user_id, target_type, target_id, value)
values (auth.uid(), 'question', '20000000-0000-4000-8000-000000000001', 1);
select test.expect_error($$insert into public.votes (user_id, target_type, target_id, value)
  values (auth.uid(), 'answer', '30000000-0000-4000-8000-000000000001', 1)$$, 'own post');
select test.expect_error($$insert into public.content_tags (target_type, target_id, move_id)
  select 'question', '20000000-0000-4000-8000-000000000001', id from public.moves where slug = 'butterfly'$$,
  'row-level security');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000b');
set role authenticated;
insert into public.answers (id, question_id, author_id, body, is_technique, is_conditioning)
values ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', auth.uid(),
  'Tuck first, then lift the hips', true, true);
insert into public.votes (user_id, target_type, target_id, value)
values (auth.uid(), 'answer', '30000000-0000-4000-8000-000000000001', 1);
reset role;

select test.expect_equal((select reputation::text from public.profiles where id = '00000000-0000-4000-8000-00000000000c'),
  '5', 'question upvote gives 5');
select test.expect_equal((select reputation::text from public.profiles where id = '00000000-0000-4000-8000-00000000000d'),
  '10', 'answer upvote gives 10');
select test.expect_equal((select answer_count::text from public.questions where id = '20000000-0000-4000-8000-000000000001'),
  '2', 'answer count');

select test.as_member('00000000-0000-4000-8000-00000000000d');
set role authenticated;
update public.questions set accepted_answer_id = '30000000-0000-4000-8000-000000000001'
where id = '20000000-0000-4000-8000-000000000001';
reset role;
select test.expect_equal((select accepted_answer_id::text from public.questions
  where id = '20000000-0000-4000-8000-000000000001'), null, 'only the asker accepts');

select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
update public.questions set accepted_answer_id = '30000000-0000-4000-8000-000000000001'
where id = '20000000-0000-4000-8000-000000000001';
insert into public.comments (answer_id, author_id, body)
values ('30000000-0000-4000-8000-000000000002', auth.uid(), 'Thank you!');
insert into public.reports (reporter_id, target_type, target_id, reason)
values (auth.uid(), 'answer', '30000000-0000-4000-8000-000000000002', 'Testing the report button');
reset role;

select test.expect_equal((select reputation::text from public.profiles where id = '00000000-0000-4000-8000-00000000000d'),
  '25', 'accepted answer adds 15');

select test.as_member('00000000-0000-4000-8000-00000000000d');
set role authenticated;
delete from public.votes where target_id = '20000000-0000-4000-8000-000000000001';
select test.expect_equal((select count(*)::text from public.reports), '0', 'students do not see other reports');
reset role;
select test.expect_equal((select reputation::text from public.profiles where id = '00000000-0000-4000-8000-00000000000c'),
  '0', 'removing a vote takes the points back');

-- ===== Move dictionary =====
select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
select test.expect_error($$insert into public.moves (name, slug, category, level) values ('X', 'x', 'spin', 'beginner')$$,
  'row-level security');
select test.expect_equal((select slug from public.search_moves('gemini') limit 1), 'outside-leg-hang', 'alias search');
select test.expect_equal((select count(*)::text from public.search_moves('')), '24', 'empty search lists all');
insert into public.saved_moves (user_id, move_id, status)
select auth.uid(), id, 'working_on' from public.moves where slug = 'basic-invert';
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000a');
set role authenticated;
insert into public.moves (name, slug, category, level) values ('Test Move', 'test-move', 'spin', 'beginner');
delete from public.moves where slug = 'test-move';
reset role;

-- ===== Combos, challenges, class plans =====
select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
insert into public.combos (id, author_id, title) values ('40000000-0000-4000-8000-000000000001', auth.uid(), 'Spin flow');
insert into public.combo_moves (combo_id, position, move_id)
select '40000000-0000-4000-8000-000000000001', 1, id from public.moves where slug = 'fireman-spin';
select test.expect_error($$insert into public.challenges (title, level, starts_at, ends_at)
  values ('Nope', 'beginner', now(), now() + interval '7 days')$$, 'row-level security');
select test.expect_error($$insert into public.class_plans (author_id, title) values (auth.uid(), 'My plan')$$,
  'row-level security');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000d');
set role authenticated;
select test.expect_error($$insert into public.combo_moves (combo_id, position, move_id)
  select '40000000-0000-4000-8000-000000000001', 2, id from public.moves where slug = 'chair-spin'$$,
  'row-level security');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000a');
set role authenticated;
insert into public.challenges (id, title, level, starts_at, ends_at)
values ('50000000-0000-4000-8000-000000000001', 'Spin week', 'beginner', now() - interval '1 day', now() + interval '6 days');
insert into public.challenges (id, title, level, starts_at, ends_at)
values ('50000000-0000-4000-8000-000000000002', 'Last week', 'beginner', now() - interval '14 days', now() - interval '7 days');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000d');
set role authenticated;
insert into public.challenge_entries (id, challenge_id, user_id, video_id)
values ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', auth.uid(),
  '10000000-0000-4000-8000-000000000006');
select test.expect_error($$insert into public.challenge_entries (challenge_id, user_id, video_id)
  values ('50000000-0000-4000-8000-000000000002', auth.uid(), '10000000-0000-4000-8000-000000000004')$$, 'not open');
select test.expect_error($$update public.challenge_entries set is_featured = true
  where id = '60000000-0000-4000-8000-000000000001'$$, 'only an admin');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
insert into public.votes (user_id, target_type, target_id, value)
values (auth.uid(), 'challenge_entry', '60000000-0000-4000-8000-000000000001', 1);
reset role;
select test.expect_equal((select score::text from public.challenge_entries where id = '60000000-0000-4000-8000-000000000001'),
  '1', 'entry vote');

select test.as_member('00000000-0000-4000-8000-00000000000a');
set role authenticated;
update public.challenge_entries set is_featured = true where id = '60000000-0000-4000-8000-000000000001';
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000b');
set role authenticated;
insert into public.class_plans (id, author_id, title) values ('70000000-0000-4000-8000-000000000001', auth.uid(), 'Tuesday beginners');
insert into public.class_plan_items (plan_id, position, section, note)
values ('70000000-0000-4000-8000-000000000001', 1, 'warm_up', 'Shoulder circles');
select test.expect_error($$insert into public.class_plans (author_id, title, is_suggested)
  values (auth.uid(), 'For everyone', true)$$, 'row-level security');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
select test.expect_equal((select count(*)::text from public.class_plans), '0', 'students do not see private plans');
reset role;

-- ===== Courses =====
select test.as_member('00000000-0000-4000-8000-00000000000a');
set role authenticated;
insert into public.media_assets (id, owner_id, kind, storage_path, visibility, duration_seconds)
values ('10000000-0000-4000-8000-000000000005', auth.uid(), 'video', '00000000-0000-4000-8000-00000000000a/lesson.mp4', 'course', 600);
insert into public.courses (id, slug, title, level, price_cents, is_published)
values ('80000000-0000-4000-8000-000000000001', 'first-invert', 'Your first invert', 'beginner', 3900, true);
insert into public.lessons (id, course_id, position, title, is_free_preview)
values ('90000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 1, 'Welcome', true);
insert into public.lessons (id, course_id, position, title, video_id)
values ('90000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 2, 'The tuck',
  '10000000-0000-4000-8000-000000000005');
insert into public.courses (slug, title, level, is_published) values ('draft-course', 'Draft course', 'beginner', false);
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
select test.expect_equal((select count(*)::text from public.courses), '1', 'drafts are hidden');
select test.expect_equal((select count(*)::text from public.lessons), '1', 'only the free preview opens');
select test.expect_equal((select count(*)::text from public.course_outline('80000000-0000-4000-8000-000000000001')),
  '2', 'outline lists every lesson');
select test.expect_equal((select count(*)::text from public.media_assets where id = '10000000-0000-4000-8000-000000000005'),
  '0', 'lesson video locked');
select test.expect_error($$insert into public.enrollments (user_id, course_id)
  values (auth.uid(), '80000000-0000-4000-8000-000000000001')$$, 'row-level security');
select test.expect_error($$select public.admin_grant_course('80000000-0000-4000-8000-000000000001', 's1@test.local')$$,
  'only an admin');
select test.expect_error($$insert into public.lesson_progress (user_id, lesson_id)
  values (auth.uid(), '90000000-0000-4000-8000-000000000002')$$, 'row-level security');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000a');
set role authenticated;
select public.admin_grant_course('80000000-0000-4000-8000-000000000001', 'S1@test.local');
select test.expect_equal((select count(*)::text from public.admin_course_students('80000000-0000-4000-8000-000000000001')),
  '1', 'admin sees the student');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000c');
set role authenticated;
select test.expect_equal((select count(*)::text from public.lessons), '2', 'bought course opens every lesson');
select test.expect_equal((select count(*)::text from public.media_assets where id = '10000000-0000-4000-8000-000000000005'),
  '1', 'lesson video opens after access');
insert into public.lesson_progress (user_id, lesson_id) values (auth.uid(), '90000000-0000-4000-8000-000000000002');
select test.expect_equal((select count(*)::text from public.course_outline('80000000-0000-4000-8000-000000000001') where is_done),
  '1', 'progress shows');
reset role;

select test.as_member('00000000-0000-4000-8000-00000000000a');
set role authenticated;
select test.expect_equal((select count(*)::text from public.admin_list_members()), '4', 'admin lists members');
update public.profiles set role = 'teacher' where id = '00000000-0000-4000-8000-00000000000c';
reset role;

select 'All permission checks passed' as result;
