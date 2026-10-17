import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { toggleLessonDone } from "@/app/actions/courses"
import { FormShell } from "@/components/form-shell"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { createClient } from "@/lib/supabase/server"

type OutlineRow = { id: string; position: number; title: string; is_unlocked: boolean; is_done: boolean }

export default function LessonPage(props: PageProps<"/courses/[slug]/lessons/[lessonId]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading lesson…" />}>
      <Lesson params={props.params} />
    </Suspense>
  )
}

async function Lesson({ params }: { params: PageProps<"/courses/[slug]/lessons/[lessonId]">["params"] }) {
  const { slug, lessonId } = await params
  if (!isUuid(lessonId)) notFound()
  await requireUser()
  const supabase = await createClient()

  // The database only returns a lesson to buyers, admins, or when it is a free preview.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, position, title, body, video_id")
    .eq("id", lessonId)
    .maybeSingle()

  if (!lesson) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">This lesson is locked</h1>
        <p className="text-base text-muted-foreground">It opens once you have the course.</p>
        <Button render={<Link href={`/courses/${slug}`} />} variant="outline" className="h-11 text-base">
          Back to the course
        </Button>
      </div>
    )
  }

  const { data: outline } = await supabase.rpc("course_outline", { item_id: lesson.course_id as string })
  const lessons = (outline ?? []) as OutlineRow[]
  const index = lessons.findIndex((item) => item.id === lessonId)
  const isDone = lessons[index]?.is_done ?? false
  const next = lessons.slice(index + 1).find((item) => item.is_unlocked)
  const path = `/courses/${slug}/lessons/${lessonId}`

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/courses/${slug}`} className="inline-flex h-11 items-center text-sm text-muted-foreground">
        ← All lessons
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {lesson.position as number}. {lesson.title as string}
      </h1>
      <MediaView id={lesson.video_id as string | null} />
      {lesson.body ? <p className="whitespace-pre-wrap text-base">{lesson.body as string}</p> : null}

      <FormShell
        action={toggleLessonDone}
        submitLabel={isDone ? "✓ Done — tap to undo" : "Mark as done"}
        variant={isDone ? "outline" : "default"}
      >
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="path" value={path} />
        <input type="hidden" name="done" value={isDone ? "no" : "yes"} />
      </FormShell>

      {next ? (
        <Button
          render={<Link href={`/courses/${slug}/lessons/${next.id}`} />}
          variant="outline"
          className="h-11 text-base"
        >
          Next: {next.title}
        </Button>
      ) : null}
    </div>
  )
}
