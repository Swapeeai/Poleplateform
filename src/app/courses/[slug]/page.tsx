import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MoveChips } from "@/components/bits"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isAdmin, requireUser } from "@/lib/auth"
import { formatPrice } from "@/lib/labels"
import { getMovesByIds } from "@/lib/moves"
import { levelLabel, type DanceLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

type OutlineRow = {
  id: string
  position: number
  title: string
  is_free_preview: boolean
  has_video: boolean
  is_unlocked: boolean
  is_done: boolean
}

export default function CoursePage(props: PageProps<"/courses/[slug]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading course…" />}>
      <Course params={props.params} />
    </Suspense>
  )
}

async function Course({ params }: { params: PageProps<"/courses/[slug]">["params"] }) {
  const { slug } = await params
  const session = await requireUser()
  const supabase = await createClient()

  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle()
  if (!course) notFound()
  const id = course.id as string

  const [{ data: outline }, { data: enrollment }, { data: prereqRows }] = await Promise.all([
    supabase.rpc("course_outline", { item_id: id }),
    supabase.from("enrollments").select("source").eq("course_id", id).eq("user_id", session.userId).maybeSingle(),
    supabase.from("course_prerequisites").select("move_id").eq("course_id", id),
  ])
  const lessons = (outline ?? []) as OutlineRow[]
  const prerequisites = await getMovesByIds((prereqRows ?? []).map((row) => row.move_id as string))
  const owns = Boolean(enrollment) || isAdmin(session)
  const done = lessons.filter((lesson) => lesson.is_done).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{course.title as string}</h1>
        {course.goal ? <p className="text-base">{course.goal as string}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{levelLabel[course.level as DanceLevel]}</Badge>
          <Badge variant="outline">{lessons.length} lessons</Badge>
          {!course.is_published ? <Badge variant="destructive">Draft</Badge> : null}
        </div>
        {isAdmin(session) ? (
          <Button render={<Link href={`/admin/courses/${id}`} />} variant="secondary" className="h-11 text-base">
            Edit course
          </Button>
        ) : null}
      </div>

      {course.trailer_video_id ? (
        <MediaView id={course.trailer_video_id as string} />
      ) : course.cover_image_id ? (
        <MediaView id={course.cover_image_id as string} alt={course.title as string} />
      ) : null}

      {owns ? (
        <p className="rounded-lg bg-muted p-3 text-base">
          {enrollment ? "You own this course." : "You are an admin, so every lesson is open."} {done} of{" "}
          {lessons.length} lessons done.
        </p>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-primary/30 p-3">
          <p className="text-2xl font-semibold">{formatPrice(course.price_cents as number, course.currency as string)}</p>
          <p className="text-base">
            Card payment is not switched on yet. To get this course now, message the founder and it will be opened
            for you. Lessons marked Free preview are open to everyone.
          </p>
        </div>
      )}

      {course.description ? <p className="whitespace-pre-wrap text-base">{course.description as string}</p> : null}

      {prerequisites.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">You should already know</h2>
          <MoveChips moves={prerequisites} />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Lessons</h2>
        <ol className="flex flex-col">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="border-b last:border-b-0">
              {lesson.is_unlocked ? (
                <Link
                  href={`/courses/${slug}/lessons/${lesson.id}`}
                  className="flex min-h-12 items-center gap-3 py-2"
                >
                  <span className="w-6 text-sm text-muted-foreground">{lesson.position}</span>
                  <span className="flex-1 text-base">{lesson.title}</span>
                  {lesson.is_done ? <span aria-label="Done">✓</span> : null}
                  {lesson.is_free_preview && !owns ? <Badge variant="outline">Free preview</Badge> : null}
                </Link>
              ) : (
                <div className="flex min-h-12 items-center gap-3 py-2 text-muted-foreground">
                  <span className="w-6 text-sm">{lesson.position}</span>
                  <span className="flex-1 text-base">{lesson.title}</span>
                  <span aria-label="Locked">🔒</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
