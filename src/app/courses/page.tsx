import { Suspense } from "react"
import Link from "next/link"
import { EmptyNote } from "@/components/bits"
import { PageHeader } from "@/components/fields"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isAdmin, requireUser } from "@/lib/auth"
import { formatPrice } from "@/lib/labels"
import { levelLabel, type DanceLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

export default function CoursesPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading courses…" />}>
      <Courses />
    </Suspense>
  )
}

async function Courses() {
  const session = await requireUser()
  const supabase = await createClient()
  const [{ data: courses }, { data: mine }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, goal, level, price_cents, currency, cover_image_id, is_published")
      .order("created_at", { ascending: false }),
    supabase.from("enrollments").select("course_id").eq("user_id", session.userId),
  ])
  const owned = new Set((mine ?? []).map((row) => row.course_id as string))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Courses" lead="Short courses from the founder. Each one has a clear goal. Buy once, keep forever.">
        {isAdmin(session) ? (
          <Button render={<Link href="/admin/courses" />} variant="secondary" className="h-11 text-base">
            Manage courses
          </Button>
        ) : null}
      </PageHeader>

      {(courses ?? []).length === 0 ? <EmptyNote>No courses yet. They are coming soon.</EmptyNote> : null}

      {(courses ?? []).map((course) => (
        <Link
          key={course.id as string}
          href={`/courses/${course.slug}`}
          className="flex flex-col gap-2 rounded-lg border p-3"
        >
          {course.cover_image_id ? (
            <MediaView id={course.cover_image_id as string} alt={course.title as string} />
          ) : null}
          <span className="text-lg font-semibold">{course.title as string}</span>
          {course.goal ? <span className="text-base text-muted-foreground">{course.goal as string}</span> : null}
          <span className="flex flex-wrap gap-2">
            <Badge variant="secondary">{levelLabel[course.level as DanceLevel]}</Badge>
            {owned.has(course.id as string) ? (
              <Badge>Yours</Badge>
            ) : (
              <Badge variant="outline">{formatPrice(course.price_cents as number, course.currency as string)}</Badge>
            )}
            {!course.is_published ? <Badge variant="destructive">Draft — only admins see it</Badge> : null}
          </span>
        </Link>
      ))}
    </div>
  )
}
