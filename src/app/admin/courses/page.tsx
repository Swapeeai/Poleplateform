import { Suspense } from "react"
import { AdminDenied } from "@/components/admin-denied"
import { EmptyNote, ListLink } from "@/components/bits"
import { CourseForm } from "@/components/course-form"
import { PageHeader } from "@/components/fields"
import { PageFallback } from "@/components/page-fallback"
import { isAdmin, requireUser } from "@/lib/auth"
import { formatPrice } from "@/lib/labels"
import { getMoveOptions } from "@/lib/moves"
import { createClient } from "@/lib/supabase/server"

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminCourses />
    </Suspense>
  )
}

async function AdminCourses() {
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const [{ data: courses }, moves] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, is_published, price_cents, currency")
      .order("created_at", { ascending: false }),
    getMoveOptions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Courses" lead="Open a course to add lessons and give people access." />
      {(courses ?? []).length === 0 ? <EmptyNote>No courses yet. Create the first one below.</EmptyNote> : null}
      <div className="flex flex-col">
        {(courses ?? []).map((course) => (
          <ListLink
            key={course.id as string}
            href={`/admin/courses/${course.id}`}
            title={course.title as string}
            sub={formatPrice(course.price_cents as number, course.currency as string)}
            side={course.is_published ? "Published" : "Draft"}
          />
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">New course</h2>
        <CourseForm ownerId={session.userId} moves={moves} />
      </section>
    </div>
  )
}
