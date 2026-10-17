import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteLesson, grantCourse, removeAccess, saveLesson } from "@/app/actions/courses"
import { AdminDenied } from "@/components/admin-denied"
import { EmptyNote } from "@/components/bits"
import { CourseForm, type CourseFormValues } from "@/components/course-form"
import { CheckField, PageHeader, TextArea, TextField } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { PageFallback } from "@/components/page-fallback"
import { isAdmin, requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { formatDate } from "@/lib/labels"
import { getMoveOptions } from "@/lib/moves"
import { createClient } from "@/lib/supabase/server"

type Lesson = {
  id: string
  position: number
  title: string
  body: string
  video_id: string | null
  is_free_preview: boolean
}
type Student = { user_id: string; display_name: string; email: string; source: string; created_at: string }

export default function AdminCoursePage(props: PageProps<"/admin/courses/[id]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminCourse params={props.params} />
    </Suspense>
  )
}

async function AdminCourse({ params }: { params: PageProps<"/admin/courses/[id]">["params"] }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const [{ data: course }, { data: lessonRows }, { data: studentRows }, { data: prereqs }, moves] =
    await Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("id, position, title, body, video_id, is_free_preview").eq("course_id", id).order("position"),
      supabase.rpc("admin_course_students", { item_id: id }),
      supabase.from("course_prerequisites").select("move_id").eq("course_id", id),
      getMoveOptions(),
    ])
  if (!course) notFound()

  const lessons = (lessonRows ?? []) as Lesson[]
  const students = (studentRows ?? []) as Student[]
  const values: CourseFormValues = {
    ...(course as Omit<CourseFormValues, "moveIds">),
    moveIds: (prereqs ?? []).map((row) => row.move_id as string),
  }
  const nextPosition = (lessons.at(-1)?.position ?? 0) + 1

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={values.title}>
        <Link className="text-sm underline" href={`/courses/${values.slug}`}>
          See it as a member
        </Link>
      </PageHeader>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Who has access ({students.length})</h2>
        <p className="text-sm text-muted-foreground">
          Card payment is not connected yet. When someone pays you, add their email here. They must have an
          account first.
        </p>
        <FormShell action={grantCourse} submitLabel="Give access" resetOnSuccess>
          <input type="hidden" name="courseId" value={id} />
          <TextField name="email" label="Member's email" type="email" required />
        </FormShell>
        {students.map((student) => (
          <div key={student.user_id} className="flex items-center gap-3 border-b py-2 last:border-b-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base">{student.display_name}</span>
              <span className="truncate text-sm text-muted-foreground">
                {student.email} · since {formatDate(student.created_at)}
              </span>
            </span>
            <FormShell action={removeAccess} submitLabel="Remove" variant="outline" className="w-28">
              <input type="hidden" name="courseId" value={id} />
              <input type="hidden" name="userId" value={student.user_id} />
            </FormShell>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Lessons</h2>
        {lessons.length === 0 ? <EmptyNote>No lessons yet.</EmptyNote> : null}
        {lessons.map((lesson) => (
          <details key={lesson.id} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-base">
              {lesson.position}. {lesson.title}
              {lesson.is_free_preview ? " · Free preview" : ""}
              {lesson.video_id ? "" : " · no video"}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <LessonForm courseId={id} ownerId={session.userId} lesson={lesson} />
              <FormShell action={deleteLesson} submitLabel="Delete lesson" variant="destructive">
                <input type="hidden" name="courseId" value={id} />
                <input type="hidden" name="lessonId" value={lesson.id} />
              </FormShell>
            </div>
          </details>
        ))}
        <div className="rounded-lg border border-dashed p-3">
          <h3 className="mb-3 text-base font-semibold">Add a lesson</h3>
          <LessonForm courseId={id} ownerId={session.userId} nextPosition={nextPosition} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Course details</h2>
        <CourseForm ownerId={session.userId} moves={moves} course={values} />
      </section>
    </div>
  )
}

function LessonForm({
  courseId,
  ownerId,
  lesson,
  nextPosition,
}: {
  courseId: string
  ownerId: string
  lesson?: Lesson
  nextPosition?: number
}) {
  return (
    <FormShell action={saveLesson} submitLabel={lesson ? "Save lesson" : "Add lesson"} resetOnSuccess={!lesson}>
      <input type="hidden" name="courseId" value={courseId} />
      {lesson ? <input type="hidden" name="lessonId" value={lesson.id} /> : null}
      <TextField name="position" label="Lesson number" type="number" required defaultValue={lesson?.position ?? nextPosition} />
      <TextField name="title" label="Title" required maxLength={120} defaultValue={lesson?.title} />
      <TextArea name="body" label="Text" rows={4} maxLength={20000} defaultValue={lesson?.body} />
      <MediaUpload
        name="videoId"
        ownerId={ownerId}
        kind="video"
        label={lesson?.video_id ? "Replace the video" : "Lesson video"}
        hint="Only people with access can watch it (and everyone, if it is a free preview)."
        visibilities={["course"]}
      />
      <CheckField
        name="preview"
        label="Free preview"
        hint="Everyone can open this lesson, even without buying."
        defaultChecked={lesson?.is_free_preview}
      />
    </FormShell>
  )
}
