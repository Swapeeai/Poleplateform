-- Do not invent logins here. A seed user would need a made-up password.
--
-- After you sign up in the app with your own email, run the update below in
-- the Supabase SQL editor. Change the email first. Until you do that, the
-- update matches nobody, which is safe.

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('you@example.com')
);

-- When a teacher has signed up with their own email, you can verify them
-- with the same kind of update. Uncomment it and change the email.
--
-- update public.profiles
-- set role = 'teacher',
--     is_verified_teacher = true
-- where id = (
--   select id
--   from auth.users
--   where lower(email) = lower('teacher@example.com')
-- );
