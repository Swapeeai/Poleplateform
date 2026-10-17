# APP_NAME

Working name until a real one is chosen. Every screen says `APP_NAME` on purpose.

This repository is **Phase 1, step 1 only**: project setup, sign-in, profiles, and roles.

Not in this step: the move dictionary, video, questions and answers, combos, or payments. No Mux, Stripe, or Cloudflare Stream.

## Plan

Written before the feature code.

Signed-in members get a profile. New accounts start as students. An admin can later mark someone as a teacher or an admin, and can mark a teacher as verified. The database enforces that, not only the buttons. A student cannot promote themselves by calling the API.

People stay signed out of every page except sign-in, sign-up, and the short stop where Google or email sends them back.

Demo people are not invented here. A seed login would need a made-up password, so `supabase/seed.sql` only contains the SQL you run after you sign up with your own email.

Profile types live in `src/lib/profile.ts` (the first note said `database.types.ts`).

### Files

- `README.md` — this plan, how to test, and what you set up
- `.env.example` — variable names, empty values
- `.gitignore` — keeps `.env.local` out of git
- `src/proxy.ts` — sends guests to sign-in and refreshes the login cookie
- `src/lib/supabase/env.ts` — reads the public Supabase URL and anon key
- `src/lib/supabase/server.ts` — Supabase client for pages and actions
- `src/lib/supabase/proxy.ts` — cookie refresh used by the proxy
- `src/lib/auth.ts` — who is signed in, and what is their profile
- `src/lib/copy.ts` — English text, with `APP_NAME` in one place
- `src/lib/profile.ts` — profile shape, levels, and roles
- `src/lib/profile-fields.ts` — checks display name, level, Instagram, and the rest
- `src/lib/db-error.ts` — turns a database refusal into a sentence
- `src/app/layout.tsx` — page shell
- `src/app/page.tsx` — home for a signed-in member
- `src/app/sign-in/page.tsx` — email and Google sign-in
- `src/app/sign-up/page.tsx` — create an account
- `src/app/auth/callback/route.ts` — finishes Google and email confirmation
- `src/app/profile/page.tsx` — view your profile
- `src/app/profile/edit/page.tsx` — edit the fields you are allowed to edit
- `src/app/admin/page.tsx` — set roles and the verified-teacher flag
- `src/app/global-error.tsx` — fallback if the app crashes
- `src/app/actions/auth.ts` — sign up, sign in, Google, sign out
- `src/app/actions/profile.ts` — save your own profile
- `src/app/actions/members.ts` — admin changes a role or verified flag
- `src/components/site-header.tsx` — top bar
- `src/components/auth-form.tsx` — sign-in and sign-up forms
- `src/components/profile-form.tsx` — profile form
- `src/components/member-form.tsx` — one person on the admin page
- `src/components/ui/*` — shadcn/ui pieces (button, input, label, card, badge)
- `supabase/config.toml` — Supabase CLI project file
- `supabase/migrations/20261017140000_profiles.sql` — table, trigger, and row-level security
- `supabase/seed.sql` — SQL you run to become admin. No passwords.

## What you need to set up

You do this once. The app cannot sign anyone in until these exist.

1. **Install Node.js** (20 or newer) and, in this folder, run `npm install`.

2. **Create a Supabase project** at [supabase.com](https://supabase.com). The free project is enough. Pick a database password and store it somewhere safe. This app does not use that password.

3. **Apply the database migration.** Either way works:
   - **SQL editor:** open Supabase → SQL Editor → New query, paste the whole file `supabase/migrations/20261017140000_profiles.sql`, and run it.
   - **Supabase CLI:** `npx supabase login`, then `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. The project ref is in the project URL: `https://YOUR_PROJECT_REF.supabase.co`.

4. **Turn on email sign-in.** Supabase → Authentication → Sign In / Providers → Email. Leave it enabled.
   - For your first test, turn **Confirm email** off. Then creating an account signs you in immediately.
   - If you leave Confirm email on, you must open the link in the email before you can sign in. Add `http://localhost:3000/auth/callback` under Authentication → URL Configuration → Redirect URLs so that link can return to the app.

5. **Turn on Google sign-in.**
   - In Google Cloud Console, create an OAuth client (Web application).
   - Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Supabase → Authentication → Sign In / Providers → Google. Paste the client ID and client secret.
   - Supabase → Authentication → URL Configuration:
     - Site URL: `http://localhost:3000`
     - Redirect URLs: `http://localhost:3000/auth/callback`
   - When you deploy, add the real site address as well (for example `https://your-app.vercel.app/auth/callback`) and set `NEXT_PUBLIC_SITE_URL` to that address.

6. **Create `.env.local`** in this folder (it stays on your machine):

   ```bash
   cp .env.example .env.local
   ```

   Fill in:

   | Name | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
   | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` while you test locally |

   Do **not** put the `service_role` key in `.env.local`. The app does not need it. Anyone with that key can bypass the role rules.

7. **Restart** after you change `.env.local`. Stop the app and run `npm run dev` again. Put the keys in place before `npm run build` as well. Next.js bakes `NEXT_PUBLIC_` values in at build time.

8. **Make your login an admin** after you have signed up once. Open the SQL editor and run the update from `supabase/seed.sql`, with your real email instead of `you@example.com`. A person has one role. Your founder login is the admin. A teacher badge needs a separate teacher login.

## How to test

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`. A phone-width window is the layout this step is built for.
4. You should land on **Sign in**. If you see “This app needs a Supabase project”, `.env.local` is missing or the app was not restarted.
5. Choose **Create an account**. Enter a display name, your email, and a password of at least 8 characters. Or choose **Continue with Google**.
6. Fill in country, level, and years dancing. Studio and Instagram can stay blank. Save.
7. You should see your profile. The role is **Student**. Reputation is **0**. You cannot edit reputation.
8. Open **Members** from the address bar (`/admin`) before you promote yourself. The page should say only an admin can open it. There is no Members link in the header yet.
9. Run the admin update from the setup list, then refresh. The header now has **Members**.
10. Create a second account in a private window. On the admin account, set that person to **Teacher**, check **Verified teacher**, and save. Then sign in as them. The profile shows Teacher and Verified teacher.
11. As the teacher, open Members. The page refuses. The profile form has no role field. The database also refuses a role change from that account.
12. **Sign out** returns you to Sign in. Home, profile, and members all send a guest back to Sign in.

`npm test` checks the profile field rules (Instagram handle, avatar link, level, years). It does not talk to Supabase.

## Roles, in one paragraph

Everyone starts as a student. A teacher is a student plus a role an admin sets. Verified teacher is a separate flag, only for teachers, also set by an admin. The admin is the founder login. Row-level security lets a member edit only their own profile, and a trigger rejects role, verification, and reputation changes unless the person is an admin (or, for the very first promotion, you are in the SQL editor, which is not a signed-in member).
