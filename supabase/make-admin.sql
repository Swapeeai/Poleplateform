-- Make your own login the admin.
--
-- 1. Sign up in the app with your email.
-- 2. Replace you@example.com below with that email.
-- 3. Run this in the Supabase SQL editor.
--
-- Until you change the email, this matches nobody, so it is safe to run.

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('you@example.com')
);
