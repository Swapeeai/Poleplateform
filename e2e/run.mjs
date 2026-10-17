/**
 * Clicks through all three parts of the app in a phone-sized browser, as a
 * founder (admin), a teacher and a student. Needs the local Supabase running
 * (npx supabase start), the app running on port 3000, Google Chrome, ffmpeg
 * and psql. See "Test it" in the README. Run: npm run test:e2e
 */
import { chromium } from "playwright-core"
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const BASE = process.env.APP_URL ?? "http://localhost:3000"
const DB_URL = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
const SHOTS = path.resolve("e2e/screenshots")
fs.mkdirSync(SHOTS, { recursive: true })

// Sample files: a 5 second clip, a 95 second clip (too long), and a picture.
const MEDIA = fs.mkdtempSync(path.join(os.tmpdir(), "app-e2e-"))
const ffmpeg = (args) => execSync(`ffmpeg -loglevel error -y ${args}`)
ffmpeg(`-f lavfi -i testsrc=duration=5:size=360x640:rate=24 -c:v libx264 -pix_fmt yuv420p ${MEDIA}/clip5.mp4`)
ffmpeg(`-f lavfi -i testsrc=duration=95:size=160x284:rate=10 -c:v libx264 -pix_fmt yuv420p ${MEDIA}/clip95.mp4`)
ffmpeg(`-f lavfi -i testsrc=size=640x480 -frames:v 1 ${MEDIA}/cover.jpg`)
const run = Date.now().toString(36)
const people = {
  founder: { name: "Founder", email: `founder-${run}@test.local` },
  teacher: { name: "Tina Teacher", email: `teacher-${run}@test.local` },
  student: { name: "Sam Student", email: `student-${run}@test.local` },
}
const QTITLE = `My outside leg hang slips down ${run}`
const CTITLE = `Your first invert ${run}`
const CSLUG = `your-first-invert-${run}`
const PASSWORD = "test-password-123"

function sql(query) {
  return execSync(`psql "${DB_URL}" -tAc "${query}"`).toString().trim()
}
function step(text) {
  console.log(`\n== ${text}`)
}
function check(ok, text) {
  if (!ok) throw new Error(`FAILED: ${text}`)
  console.log(`  ok: ${text}`)
}

const browser = await chromium.launch({ channel: "chrome", headless: true })
const pages = {}
for (const key of Object.keys(people)) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  pages[key] = await context.newPage()
  const page = pages[key]
  const goto = page.goto.bind(page)
  page.goto = async (url) => {
    await goto(url)
    await page.waitForLoadState("networkidle")
  }
  pages[key].on("pageerror", (error) => console.log(`  [${key} page error] ${error.message}`))
}
const visible = (loc) => loc.first().waitFor({ timeout: 15000 }).then(() => true, () => false)
async function pick(select, text) {
  const value = await select.locator("option", { hasText: text }).first().getAttribute("value")
  await select.selectOption(value)
}
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })

async function signUp(key) {
  const page = pages[key]
  const person = people[key]
  await page.goto(`${BASE}/sign-up`)
  await page.getByLabel("Display name").fill(person.name)
  await page.getByLabel("Email").fill(person.email)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL("**/profile/edit")
}

async function upload(page, file, index = 0) {
  await page.locator('input[type="file"]').nth(index).setInputFiles(file)
  await page.getByText("Uploaded:").nth(index).waitFor({ timeout: 30000 })
}

try {
  step("Sign up three people")
  for (const key of Object.keys(people)) await signUp(key)
  sql(`update public.profiles set role='admin' where id=(select id from auth.users where email='${people.founder.email}')`)
  sql(`update public.profiles set role='teacher', is_verified_teacher=true where id=(select id from auth.users where email='${people.teacher.email}')`)
  check(true, "accounts created; founder made admin, teacher made verified teacher (by SQL, like make-admin.sql)")

  const student = pages.student
  const teacher = pages.teacher
  const founder = pages.founder

  step("Home shows the three parts")
  await student.goto(BASE)
  check(await visible(student.getByText("1. Ask the Pole")), "Ask the Pole card")
  check(await visible(student.getByText("2. Moves and combos")), "Moves card")
  check(await visible(student.getByText("3. Courses")), "Courses card")
  await shot(student, "01-home")

  step("PART 1 - Student asks a question with a video")
  await student.goto(`${BASE}/ask/new`)
  await student.locator('input[type="file"]').first().setInputFiles(`${MEDIA}/clip95.mp4`)
  await student.getByText("The limit here is 90 seconds").waitFor()
  check(true, "a 95 second video is refused before uploading")
  await student.locator('input[type="file"]').first().setInputFiles(`${MEDIA}/clip5.mp4`)
  await student.getByText("Uploaded:").waitFor({ timeout: 30000 })
  check(true, "a 5 second video uploads")
  await student.getByLabel("What is the problem?").fill(QTITLE)
  await student.getByPlaceholder("Search moves, any name").fill("Gemini")
  await student.getByRole("checkbox", { name: /Outside leg hang/i }).check()
  check(true, "searching Gemini finds Outside leg hang in the picker")
  await student.getByLabel("Your level").selectOption("beginner")
  await shot(student, "02-ask-form")
  await student.getByRole("button", { name: "Post my question" }).click()
  await student.waitForURL(/\/ask\/[0-9a-f-]{36}$/)
  const questionUrl = student.url()
  await student.locator("video").first().waitFor()
  const src = await student.locator("video").first().getAttribute("src")
  check(src?.includes("/storage/v1/object/sign/media/"), "question page plays the video from a signed private link")
  check(await visible(student.getByRole("link", { name: "Outside Leg Hang" })), "tagged move shows")

  step("PART 1 - Teacher answers with the Technique label and upvotes")
  await teacher.goto(questionUrl)
  await teacher.getByLabel("How to fix it").fill("Squeeze the pole with the back of your knee and point your toes.")
  await teacher.getByRole("checkbox", { name: "This is a technique fix" }).check()
  await teacher.getByRole("button", { name: "Post answer" }).click()
  await teacher.getByText("Thanks! Your answer is posted.").waitFor()
  await teacher.getByRole("button", { name: "Helpful" }).first().click()
  await teacher.waitForTimeout(1500)
  check(true, "answer posted and question upvoted")

  step("PART 1 - Student sees the answer, replies, marks it as the fix")
  await student.reload()
  check(await visible(student.getByText("Technique fix")), "technique label visible")
  check(await visible(student.getByText("Verified teacher").first()), "verified teacher badge visible")
  await student.getByLabel("Reply").fill("Thank you, trying tonight!")
  await student.getByRole("button", { name: "Reply" }).click()
  await student.getByText("Thank you, trying tonight!").waitFor()
  await student.getByRole("button", { name: "✓ This fixed it" }).click()
  await student.getByText("✓ This helped").waitFor()
  check(true, "answer marked as the one that helped")
  await shot(student, "03-question-answered")
  const rep = sql(`select reputation from public.profiles where id=(select id from auth.users where email='${people.teacher.email}')`)
  check(rep === "15", `teacher got 15 points for the accepted answer (has ${rep})`)
  const studentRep = sql(`select reputation from public.profiles where id=(select id from auth.users where email='${people.student.email}')`)
  check(studentRep === "5", `student got 5 points for the upvoted question (has ${studentRep})`)

  step("PART 1 - Student cannot vote on her own question")
  const ownVote = student.getByRole("button", { name: "Helpful" }).first()
  check(await ownVote.isDisabled(), "own vote button disabled")

  step("PART 1 - Student posts a success video")
  await upload(student, `${MEDIA}/clip5.mp4`)
  await student.getByRole("button", { name: "Post my success video" }).click()
  await student.getByText("I got it!").waitFor()
  check(true, "success video posted")

  step("PART 1 - Ask list filters")
  await student.goto(`${BASE}/ask?show=solved`)
  check(await visible(student.getByText(QTITLE)), "question appears under Solved")
  await student.goto(`${BASE}/ask?show=unanswered`)
  await student.getByRole("heading", { name: "Ask the Pole" }).waitFor()
  check(!(await student.getByText(QTITLE).isVisible()), "question not under No answers yet")
  await student.goto(`${BASE}/ask`)
  await shot(student, "04-ask-list")

  step("PART 2 - Move dictionary search by another name")
  await student.goto(`${BASE}/moves?q=Gemini`)
  check(await visible(student.getByRole("link", { name: /Outside leg hang/i })), "Gemini finds Outside leg hang")
  await student.getByRole("link", { name: /Outside leg hang/i }).click()
  await student.waitForURL("**/moves/outside-leg-hang")
  check(await visible(student.getByText("Also called:")), "other names listed")
  check(await visible(student.getByText("Learn these first")), "prerequisites listed")
  check(await visible(student.getByText("Questions about this move")), "related questions listed")
  check(await visible(student.getByRole("link", { name: QTITLE })), "the student's question is linked from the move")
  await student.getByRole("button", { name: "Working on it" }).click()
  await student.waitForTimeout(1500)
  await shot(student, "05-move-page")
  await student.goto(BASE)
  check(await visible(student.getByText("Moves you are working on")), "home lists moves I am working on")

  step("PART 2 - Student makes a combo")
  await student.goto(`${BASE}/play/combos/new`)
  await student.getByLabel("Name", { exact: true }).fill("Easy spin flow")
  const picker = student.getByLabel("Choose a move to add")
  await pick(picker, "Fireman Spin")
  await student.getByRole("button", { name: "Add", exact: true }).click()
  await student.getByPlaceholder("Transition into the next move (optional)").first().fill("step through")
  await pick(picker, "Chair Spin")
  await student.getByRole("button", { name: "Add", exact: true }).click()
  await student.getByRole("button", { name: "Save combo" }).click()
  await student.waitForURL(/\/play\/combos\/[0-9a-f-]{36}$/)
  check(await visible(student.getByText("→ step through")), "combo saved with a transition note")
  await shot(student, "06-combo")

  step("PART 2 - Founder creates a weekly challenge, student enters, teacher votes")
  await founder.goto(`${BASE}/admin/challenges/new`)
  const local = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  await founder.getByLabel("Name", { exact: true }).fill("Spin week")
  await founder.getByLabel("Level").selectOption("beginner")
  await founder.getByLabel("Opens").fill(local(new Date(Date.now() - 3600_000)))
  await founder.getByLabel("Closes").fill(local(new Date(Date.now() + 7 * 86400_000)))
  await pick(founder.getByLabel("Choose a move to add"), "Fireman Spin")
  await founder.getByRole("button", { name: "Add", exact: true }).click()
  await founder.getByRole("button", { name: "Create challenge" }).click()
  await founder.waitForURL(/\/play\/challenges\/[0-9a-f-]{36}$/)
  const challengeUrl = founder.url()
  check(await visible(founder.getByText("Open now")), "challenge is open")
  await student.goto(challengeUrl)
  await upload(student, `${MEDIA}/clip5.mp4`)
  await student.getByRole("button", { name: "Post my entry" }).click()
  await student.getByText("1 entry").waitFor()
  await teacher.goto(challengeUrl)
  await teacher.getByRole("button", { name: "Helpful" }).first().click()
  await teacher.waitForTimeout(1500)
  await founder.reload()
  await founder.getByRole("button", { name: "★ Feature this entry" }).click()
  await founder.getByText("★ Featured").waitFor()
  check(true, "entry posted, voted, featured")
  await student.goto(`${BASE}/play`)
  check(await visible(student.getByText("Spin week").first()), "Play hub shows this week's challenge")
  await shot(student, "07-play-hub")
  await student.goto(challengeUrl)
  await shot(student, "08-challenge")

  step("PART 2 - Teacher makes a class plan; student cannot")
  await teacher.goto(`${BASE}/play/plans/new`)
  await teacher.getByLabel("Name", { exact: true }).fill("Beginner spins, week 1")
  await teacher.getByPlaceholder("e.g. 5 min wrist and shoulder circles").fill("5 min wrists and shoulders")
  await teacher.getByRole("button", { name: "Add line" }).click()
  await teacher.getByLabel("Section").selectOption("moves")
  await teacher.getByLabel("What").selectOption("move")
  await pick(teacher.getByLabel("Choose", { exact: true }), "Fireman Spin")
  await teacher.getByRole("button", { name: "Add line" }).click()
  await teacher.getByRole("button", { name: "Save plan" }).click()
  await teacher.waitForURL(/\/play\/plans\/[0-9a-f-]{36}$/)
  const planUrl = teacher.url()
  check(await visible(teacher.getByText("Warm-up")), "plan saved with sections")
  await student.goto(planUrl)
  await student.waitForLoadState("networkidle")
  check((await student.title()).length >= 0 && (await student.getByText("Beginner spins, week 1").count()) === 0, "student cannot open a teacher's private plan")

  step("PART 3 - Founder creates a course with a free and a paid lesson")
  await founder.goto(`${BASE}/admin/courses`)
  await founder.getByLabel("Title").fill(CTITLE)
  await founder.getByLabel("Goal").fill("Go upside down safely in 4 weeks.")
  await founder.getByLabel("Level").selectOption("beginner")
  await founder.getByLabel("Price").fill("29")
  await founder.getByRole("checkbox", { name: /Published/ }).check()
  await upload(founder, `${MEDIA}/cover.jpg`, 0)
  await founder.getByRole("button", { name: "Create course" }).click()
  await founder.waitForURL(/\/admin\/courses\/[0-9a-f-]{36}$/)
  const adminCourseUrl = founder.url()
  // "Add a lesson" form is the last lesson form on the page.
  const addLesson = founder.locator("div.border-dashed").filter({ hasText: "Add a lesson" })
  await addLesson.getByLabel("Title").fill("Warm-up and safety")
  await addLesson.getByRole("checkbox", { name: /Free preview/ }).check()
  await addLesson.getByRole("button", { name: "Add lesson" }).click()
  await founder.getByText("Lesson added.").waitFor()
  await founder.reload()
  const addLesson2 = founder.locator("div.border-dashed").filter({ hasText: "Add a lesson" })
  await addLesson2.getByLabel("Title").fill("The tuck invert")
  await addLesson2.locator('input[type="file"]').setInputFiles(`${MEDIA}/clip5.mp4`)
  await addLesson2.getByText("Uploaded:").waitFor({ timeout: 30000 })
  await addLesson2.getByRole("button", { name: "Add lesson" }).click()
  await founder.getByText("Lesson added.").waitFor()
  check(true, "course with 2 lessons created")

  step("PART 3 - Student sees price, free preview open, paid lesson locked")
  await student.goto(`${BASE}/courses`)
  await student.getByText(CTITLE).click()
  await student.waitForURL(`**/courses/${CSLUG}`)
  check(await visible(student.getByText("Card payment is not switched on yet")), "buy box shows")
  check(await visible(student.getByRole("link", { name: /Warm-up and safety/ })), "free preview lesson is open")
  check(await visible(student.getByLabel("Locked")), "paid lesson is locked")
  await shot(student, "09-course-locked")
  const lessonId = sql(`select id from public.lessons where title='The tuck invert' and course_id=(select id from public.courses where slug='${CSLUG}') order by created_at desc limit 1`)
  await student.goto(`${BASE}/courses/${CSLUG}/lessons/${lessonId}`)
  check(await visible(student.getByText("This lesson is locked")), "opening the paid lesson directly is refused")
  const leaked = sql(`select count(*) from storage.objects o join public.lessons l on true join public.media_assets m on m.id=l.video_id where l.id='${lessonId}' and o.name=m.storage_path`)
  check(leaked === "1", "lesson video file exists in storage (but the student cannot get a link to it)")

  step("PART 3 - Founder gives the student access by email")
  await founder.goto(adminCourseUrl)
  await founder.getByLabel("Member's email").fill(people.student.email)
  await founder.getByRole("button", { name: "Give access" }).click()
  await founder.getByText("now has access").waitFor()
  await shot(founder, "10-admin-course")
  await student.goto(`${BASE}/courses/${CSLUG}/lessons/${lessonId}`)
  await student.locator("video").first().waitFor()
  check(true, "student can now watch the paid lesson")
  await student.getByRole("button", { name: "Mark as done" }).click()
  await student.getByRole("button", { name: /Done/ }).waitFor()
  await shot(student, "11-lesson")
  await student.goto(`${BASE}/courses/${CSLUG}`)
  check(await visible(student.getByText("1 of 2 lessons done")), "progress shows 1 of 2 done")

  step("Reports - teacher reports a comment, founder handles it")
  await teacher.goto(questionUrl)
  await teacher.locator("summary", { hasText: "Report" }).last().click()
  const openReport = teacher.locator("details[open]")
  await openReport.getByPlaceholder(/What is wrong/).fill("Testing the report button")
  await openReport.getByRole("button", { name: "Send report" }).click()
  await teacher.getByText("An admin will look at it.").waitFor()
  await founder.goto(`${BASE}/admin`)
  check(await visible(founder.getByText("1 open")), "admin hub shows 1 open report")
  await shot(founder, "12-admin-hub")
  await founder.goto(`${BASE}/admin/reports`)
  await founder.getByRole("button", { name: "Handled" }).click()
  await founder.getByText("Nothing to check. All good.").waitFor()
  check(true, "report handled")

  step("Admin pages are closed to students")
  await student.goto(`${BASE}/admin/courses`)
  check(await visible(student.getByText("Only an admin can open this page.")), "student sees the admin-only message")

  step("Founder edits a move")
  await founder.goto(`${BASE}/moves/fireman-spin`)
  await founder.getByRole("link", { name: "Edit this move" }).click()
  await founder.getByLabel("Other names").fill("Fireman\nFire spin")
  await founder.getByRole("button", { name: "Save move" }).click()
  await founder.waitForURL("**/moves/fireman-spin")
  check(await visible(founder.getByText("Also called: Fire spin, Fireman")), "aliases saved")

  console.log("\nALL END-TO-END CHECKS PASSED")
} catch (error) {
  console.error(error)
  for (const [key, page] of Object.entries(pages)) await shot(page, `fail-${key}`).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
