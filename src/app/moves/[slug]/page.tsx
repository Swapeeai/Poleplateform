import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { setSavedMove } from "@/app/actions/moves"
import { ListLink, MoveChips } from "@/components/bits"
import { FormShell } from "@/components/form-shell"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isAdmin, requireUser } from "@/lib/auth"
import { categoryLabel, poleTypeLabel, type MoveCategory, type PoleType } from "@/lib/labels"
import { getMovesByIds } from "@/lib/moves"
import { levelLabel, type DanceLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

export default function MovePage(props: PageProps<"/moves/[slug]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading move…" />}>
      <Move params={props.params} />
    </Suspense>
  )
}

async function Move({ params }: { params: PageProps<"/moves/[slug]">["params"] }) {
  const { slug } = await params
  const session = await requireUser()
  const supabase = await createClient()

  const { data: move } = await supabase.from("moves").select("*").eq("slug", slug).maybeSingle()
  if (!move) notFound()
  const id = move.id as string

  const [aliases, prereqs, unlocks, variations, exercises, saved, tags, comboRows, challengeRows, courseRows] =
    await Promise.all([
      supabase.from("move_aliases").select("alias").eq("move_id", id).order("alias"),
      supabase.from("move_prerequisites").select("prerequisite_move_id").eq("move_id", id),
      supabase.from("move_prerequisites").select("move_id").eq("prerequisite_move_id", id),
      supabase.from("moves").select("id, name, slug").eq("base_move_id", id).order("name"),
      supabase.from("move_conditioning").select("conditioning_exercises(id, name, description)").eq("move_id", id),
      supabase.from("saved_moves").select("status").eq("user_id", session.userId).eq("move_id", id).maybeSingle(),
      supabase.from("content_tags").select("target_type, target_id").eq("move_id", id),
      supabase.from("combo_moves").select("combo_id").eq("move_id", id),
      supabase.from("challenge_moves").select("challenge_id").eq("move_id", id),
      supabase.from("course_prerequisites").select("course_id").eq("move_id", id),
    ])

  const tagged = (type: string) =>
    (tags.data ?? []).filter((tag) => tag.target_type === type).map((tag) => tag.target_id as string)
  const unique = (values: string[]) => [...new Set(values)]

  const questionIds = tagged("question")
  const comboIds = unique([...tagged("combo"), ...(comboRows.data ?? []).map((row) => row.combo_id as string)])
  const challengeIds = unique([
    ...tagged("challenge"),
    ...(challengeRows.data ?? []).map((row) => row.challenge_id as string),
  ])
  const courseIds = unique([...tagged("course"), ...(courseRows.data ?? []).map((row) => row.course_id as string)])

  const [prereqMoves, unlockMoves, baseMove, questions, combos, challenges, courses] = await Promise.all([
    getMovesByIds((prereqs.data ?? []).map((row) => row.prerequisite_move_id as string)),
    getMovesByIds((unlocks.data ?? []).map((row) => row.move_id as string)),
    move.base_move_id ? getMovesByIds([move.base_move_id as string]) : Promise.resolve([]),
    questionIds.length
      ? supabase
          .from("questions")
          .select("id, title, answer_count, accepted_answer_id")
          .in("id", questionIds)
          .order("score", { ascending: false })
          .limit(10)
      : null,
    comboIds.length ? supabase.from("combos").select("id, title").in("id", comboIds).limit(10) : null,
    challengeIds.length
      ? supabase.from("challenges").select("id, title, ends_at").in("id", challengeIds).limit(10)
      : null,
    courseIds.length ? supabase.from("courses").select("slug, title").in("id", courseIds).limit(10) : null,
  ])

  const status = (saved.data?.status as string | undefined) ?? ""
  const exerciseList = (exercises.data ?? [])
    .map((row) => row.conditioning_exercises as unknown as { id: string; name: string; description: string } | null)
    .filter((item): item is { id: string; name: string; description: string } => Boolean(item))

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{move.name as string}</h1>
        {(aliases.data ?? []).length > 0 ? (
          <p className="text-base text-muted-foreground">
            Also called: {(aliases.data ?? []).map((row) => row.alias as string).join(", ")}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{categoryLabel[move.category as MoveCategory]}</Badge>
          <Badge variant="secondary">{levelLabel[move.level as DanceLevel]}</Badge>
          <Badge variant="outline">{poleTypeLabel[move.pole_type as PoleType]}</Badge>
        </div>
        {baseMove[0] ? (
          <p className="text-base">
            A variation of{" "}
            <Link className="underline" href={`/moves/${baseMove[0].slug}`}>
              {baseMove[0].name}
            </Link>
          </p>
        ) : null}
        {isAdmin(session) ? (
          <Button render={<Link href={`/admin/moves/${id}`} />} variant="secondary" className="h-11 text-base">
            Edit this move
          </Button>
        ) : null}
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { value: "working_on", label: "Working on it" },
          { value: "got_it", label: "Got it ✓" },
          { value: "", label: "Not saved" },
        ].map((choice) => (
          <FormShell
            key={choice.value}
            action={setSavedMove}
            submitLabel={choice.label}
            pendingLabel="…"
            variant={status === choice.value ? "default" : "outline"}
          >
            <input type="hidden" name="moveId" value={id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="status" value={choice.value} />
          </FormShell>
        ))}
      </section>

      {move.demo_video_id ? <MediaView id={move.demo_video_id as string} /> : null}
      {move.image_id ? <MediaView id={move.image_id as string} alt={move.name as string} /> : null}
      {!move.demo_video_id && !move.image_id ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No demo video yet.
        </p>
      ) : null}

      <TextBlock title="How to do it" body={move.description as string} />
      <TextBlock title="Common mistakes" body={move.common_mistakes as string} />
      <TextBlock title="Safety" body={move.safety_notes as string} />

      <Block title="Learn these first" show={prereqMoves.length > 0}>
        <MoveChips moves={prereqMoves} />
      </Block>
      <Block title="Variations" show={(variations.data ?? []).length > 0}>
        <MoveChips moves={(variations.data ?? []) as { id: string; name: string; slug: string }[]} />
      </Block>
      <Block title="Unlocks" show={unlockMoves.length > 0}>
        <MoveChips moves={unlockMoves} />
      </Block>
      <Block title="Get stronger for it" show={exerciseList.length > 0}>
        <ul className="flex flex-col gap-2">
          {exerciseList.map((exercise) => (
            <li key={exercise.id}>
              <p className="text-base font-medium">{exercise.name}</p>
              {exercise.description ? (
                <p className="text-sm text-muted-foreground">{exercise.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Questions about this move" show>
        {(questions?.data ?? []).map((question) => (
          <ListLink
            key={question.id as string}
            href={`/ask/${question.id}`}
            title={question.title as string}
            side={question.accepted_answer_id ? "✓ Solved" : `${question.answer_count} answers`}
          />
        ))}
        <Button render={<Link href="/ask/new" />} variant="outline" className="mt-2 h-11 w-full text-base">
          Ask about this move
        </Button>
      </Block>
      <Block title="Combos with this move" show={(combos?.data ?? []).length > 0}>
        {(combos?.data ?? []).map((combo) => (
          <ListLink key={combo.id as string} href={`/play/combos/${combo.id}`} title={combo.title as string} />
        ))}
      </Block>
      <Block title="Challenges with this move" show={(challenges?.data ?? []).length > 0}>
        {(challenges?.data ?? []).map((challenge) => (
          <ListLink
            key={challenge.id as string}
            href={`/play/challenges/${challenge.id}`}
            title={challenge.title as string}
          />
        ))}
      </Block>
      <Block title="Courses for this move" show={(courses?.data ?? []).length > 0}>
        {(courses?.data ?? []).map((course) => (
          <ListLink key={course.slug as string} href={`/courses/${course.slug}`} title={course.title as string} />
        ))}
      </Block>
    </div>
  )
}

function TextBlock({ title, body }: { title: string; body: string }) {
  if (!body) return null
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap text-base">{body}</p>
    </section>
  )
}

function Block({ title, show, children }: { title: string; show: boolean; children: ReactNode }) {
  if (!show) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}
