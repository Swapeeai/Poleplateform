# APP_NAME

A mobile-first web app for pole dancers. `APP_NAME` is a placeholder until a real name is chosen; it is set in one place, `src/lib/copy.ts`.

## What the app is: three parts

| Part | What people do | Where |
|---|---|---|
| **1. Ask the Pole** | Post a short video of a move that is not working. Teachers and members answer with how to fix it. Others vote. The person who asked marks the answer that helped and can post a "got it" video. | `/ask` |
| **2. Moves and play** | A move dictionary with demo videos, pictures, other names, what to learn first, variations and strength exercises. Members build combos, join a weekly challenge, and teachers plan classes. | `/moves`, `/play` |
| **3. Courses** | The founder's short courses. Each has a goal, lessons, a price, free preview lessons, and a progress tick for each lesson. | `/courses` |

Around those: sign-in (email or Google), profiles, roles (student, teacher, verified teacher, admin), reputation points, reports, and an admin area at `/admin`.

## What is built

Everything below works and is tested end to end (see "Test it").

**Ask the Pole**
- Ask with a video (up to 90 seconds), a title, your level, the moves it is about, and what you tried.
- Answers with optional video. Teachers can label an answer as a "technique fix" or "strength / flexibility" work.
- Up and down votes, replies under each answer, "This fixed it" for the asker, and a success video.
- List filters: by move, level, no answers yet, solved, newest or most helpful.
- Reputation: +5 for an upvoted question, +10 for an upvoted answer, +15 when your answer is marked as the fix, −2 for a downvote. Never below 0. Counted by the database, so nobody can edit their own points.

**Moves and play**
- 24 starter moves with other names (for example, search "Gemini" finds Outside Leg Hang), prerequisites, variations and strength exercises. The founder edits them in the app.
- Each move page shows its demo video or picture, common mistakes, safety notes, and links to questions, combos, challenges and courses that use it.
- "Working on it" and "Got it" for each member, shown on the home page.
- Combos: moves in order, with a note for each transition, and an optional video (up to 3 minutes).
- Weekly challenges: the admin picks moves and dates. Members post one video each while it is open, others vote, and the admin features favourites. Past challenges stay visible.
- Class plans for teachers: warm-up, conditioning, moves, combo, cool-down. Private to the teacher. The admin can publish a suggested plan for all teachers.

**Courses**
- The admin creates a course: title, goal, description, level, price (EUR, USD or THB), moves you should know first, cover picture and trailer video.
- Lessons with text and video. Some can be free previews.
- Locked lessons stay locked: the database refuses to send the lesson or a link to its video to anyone who does not have the course.
- Members tick lessons as done and see their progress.

**Admin** (`/admin`)
- Reports from members, with a link to the post and "Handled" or "Dismiss".
- Add and edit moves and strength exercises.
- Courses, lessons, and who has access (give or remove access by email).
- New weekly challenge, suggested class plan.
- Members: make someone a teacher, verify teachers, make another admin.

**Videos and pictures**
- Stored privately in Supabase Storage. No public links: each view gets a link that expires after an hour, and only if the person is allowed to see the file.
- The player has no download button, no picture-in-picture and no right-click menu. This makes saving harder; it cannot stop screen recording.
- "Play without sound" when posting: the player keeps that video muted for everyone.

## Not done yet: decisions for the founder

These need your decision, or a paid service you have not approved yet.

1. **Card payments.** Stripe is not connected. Until it is, a buyer pays you directly and you give them access in Admin → Courses → (course) → "Give access". The database is ready for a payment service to add buyers automatically later.
2. **Video size.** Phones film big files. The Supabase **free** plan stops at **50 MB per file**, which is roughly 20–40 seconds of phone video. Options:
   - Supabase Pro (about 25 USD a month): files up to 200 MB in this app.
   - A video service such as Mux or Cloudflare Stream (paid per minute): shrinks videos, streams faster on mobile, and can really remove the sound. Today "Play without sound" only mutes the player; the sound is still in the file.
3. **Face blur** for people who do not want to be recognised: not built. Needs a video service.
4. **Notifications** (email or phone when someone answers you): not built.
5. **Other languages**: English only. All text is in `src/lib/copy.ts` and the page files.
6. **Real name** for the app instead of `APP_NAME`.
7. **Demo videos for the 24 starter moves**: the text is a starting point; the videos need filming. Admin → Moves → (move) → Demo video.

## Set it up

You do this once. It takes about 20 minutes.

1. **Install Node.js** 20 or newer. In this folder run `npm install`.

2. **Create a Supabase project** at [supabase.com](https://supabase.com). Save the database password somewhere safe; the app itself does not use it.

3. **Create the database tables.** Pick one way:
   - **Supabase CLI (easiest):** `npx supabase login`, then `npx supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase db push`. The project ref is the first part of your project address: `https://YOUR_PROJECT_REF.supabase.co`.
   - **SQL editor:** Supabase → SQL Editor → New query. Paste and run each file in `supabase/migrations`, **one at a time, in name order** (`…140000_profiles`, `…150000_media`, `…160000_moves`, `…170000_ask`, `…180000_play`, `…190000_courses`).

4. **Add the starter moves.** SQL Editor → paste and run `supabase/seed.sql`. Safe to run twice.

5. **Allow bigger uploads.** Supabase → Project Settings → Storage → "Upload file size limit". The free plan cannot go above 50 MB (see "Video size" above).

6. **Turn on email sign-in.** Supabase → Authentication → Sign In / Providers → Email.
   - For your first test, turn **Confirm email** off, so creating an account signs you in straight away.
   - If Confirm email stays on, add `http://localhost:3000/auth/callback` under Authentication → URL Configuration → Redirect URLs.

7. **Turn on Google sign-in.**
   - Google Cloud Console → create an OAuth client (type: Web application). Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Supabase → Authentication → Sign In / Providers → Google: paste the client ID and secret.
   - Supabase → Authentication → URL Configuration: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/auth/callback`.
   - When the app goes online, add the real address too (for example `https://your-app.vercel.app/auth/callback`).

8. **Connect the app to Supabase.** Run `cp .env.example .env.local` and fill in:

   | Name | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
   | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your real address when online |

   Never put the `service_role` key in this app. `.env.local` stays on your computer and is never committed.

9. **Start the app:** `npm run dev`, then open `http://localhost:3000`. Restart it whenever you change `.env.local`.

10. **Make yourself the admin.** Sign up in the app with your own email. Then open `supabase/make-admin.sql`, replace `you@example.com` with your email, and run it in the SQL editor. Refresh the app: "Admin" appears at the top.

11. **Make teachers.** Each teacher signs up, then you open Admin → Members, set them to Teacher and tick "Verified teacher".

**Putting it online:** [Vercel](https://vercel.com) works with no changes. Import the repository, add the three `NEXT_PUBLIC_…` values in the Vercel project settings, and add the new address to Supabase's Redirect URLs (step 7).

## Test it

### By hand, on your phone or a narrow browser window

Use three logins: you (admin), a teacher, and a student (a private window works for the second and third).

1. **Ask the Pole.** As the student: Ask → "Ask for help with a move" → add a short video, a title, a level, tick a move → Post. As the teacher: open the question, write an answer, tick "This is a technique fix", Post, and press ▲ on the question. As the student: press "✓ This fixed it", then add a success video. Check the teacher's points on their profile (15).
2. **Moves.** Moves → search "Gemini" → Outside Leg Hang. Tap "Working on it"; it now shows on Home.
3. **Combos.** Play → Make a combo → add two moves with a transition note → Save.
4. **Challenge.** As admin: Admin → New weekly challenge → dates covering today, one move → Create. As the student: open it, post a video. As the teacher: vote. As admin: "★ Feature this entry".
5. **Class plan.** As the teacher: Play → My class plans → New plan → add lines → Save. As the student, the plan's address shows "not found".
6. **Course.** As admin: Admin → Courses → fill in "New course", tick Published → Create. Add lesson 1 with "Free preview", lesson 2 with a video. As the student: lesson 1 opens, lesson 2 shows 🔒. As admin: "Give access" with the student's email. As the student: lesson 2 opens; tap "Mark as done".
7. **Reports.** As the teacher, tap "Report" under a post. As admin: Admin shows "1 open"; open Reports → Handled.
8. **Safety checks.** As the student, open `/admin` (refused) and try to vote on your own question (button greyed out).

### Automatic checks (for a developer)

- `npm test`: form and price rules. No database needed.
- `PGDATABASE=postgres bash supabase/tests/run.sh`: every database permission rule, against a throwaway local Postgres.
- `npm run test:e2e`: the walkthrough above in a phone-sized Chrome. Needs Docker for a local Supabase (`npx supabase start`), `npx supabase db reset` for a clean database, `.env.local` pointing at it (`npx supabase status` prints the URL and anon key), the app running (`npm run build && npm start`), plus ffmpeg and psql. Screenshots go to `e2e/screenshots/`.
- `npm run lint` and `npm run build`.

## How it is organised

- `supabase/migrations/` — the database, one file per part. Every rule about who can see or change what lives here (Postgres row-level security), so it holds even if someone skips the app and calls Supabase directly.
- `supabase/seed.sql` — starter moves. `supabase/make-admin.sql` — make yourself admin.
- `supabase/tests/` — the permission checks.
- `src/app/` — one folder per screen: `ask`, `moves`, `play`, `courses`, `admin`, `profile`, sign-in and sign-up. `src/app/actions/` holds what each form does when you press its button.
- `src/components/` — shared pieces: video upload, protected video player, move pickers, vote and report buttons, the bottom tab bar.
- `src/lib/` — helpers: who is signed in, labels, form reading, error messages.
- `src/proxy.ts` — sends signed-out visitors to Sign in.

Built with Next.js 16, React 19, Tailwind and shadcn/ui, Supabase (database, sign-in, file storage).

## Who can do what

| | Student | Teacher | Admin (founder) |
|---|---|---|---|
| Ask, answer, reply, vote, report, combos, challenge entries | ✓ | ✓ | ✓ |
| Label answers "technique" / "strength" | | ✓ | ✓ |
| Class plans | | ✓ (own) | ✓ (and suggested plans) |
| Edit moves, challenges, courses, access, roles, reports | | | ✓ |
| Delete a post | own | own | any |

Nobody can vote on their own post, change their own points, give themselves a role, or watch a paid lesson without access. The database checks all of these, not only the buttons.
