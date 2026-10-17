import { Suspense } from "react"
import Link from "next/link"
import { EmptyNote, ListLink } from "@/components/bits"
import { PageHeader, SelectField, toOptions } from "@/components/fields"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { formatDate } from "@/lib/labels"
import { getMoveOptions } from "@/lib/moves"
import { LEVELS, isLevel, levelLabel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

export default function AskPage(props: PageProps<"/ask">) {
  return (
    <Suspense fallback={<PageFallback label="Loading questions…" />}>
      <AskList searchParams={props.searchParams} />
    </Suspense>
  )
}

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : ""
}

async function AskList({ searchParams }: { searchParams: PageProps<"/ask">["searchParams"] }) {
  await requireUser()
  const params = await searchParams
  const move = one(params.move)
  const level = one(params.level)
  const show = one(params.show)
  const sort = one(params.sort)

  const supabase = await createClient()
  const moves = await getMoveOptions()

  let query = supabase
    .from("questions")
    .select("id, title, level, score, answer_count, accepted_answer_id, created_at")
    .limit(50)

  if (isLevel(level)) query = query.eq("level", level)
  if (show === "unanswered") query = query.eq("answer_count", 0)
  if (show === "solved") query = query.not("accepted_answer_id", "is", null)

  const pickedMove = moves.find((item) => item.slug === move)
  if (pickedMove) {
    const { data: tags } = await supabase
      .from("content_tags")
      .select("target_id")
      .eq("target_type", "question")
      .eq("move_id", pickedMove.id)
    query = query.in("id", (tags ?? []).map((tag) => tag.target_id as string))
  }

  query =
    sort === "top"
      ? query.order("score", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false })

  const { data } = await query
  const questions = data ?? []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ask the Pole"
        lead="Stuck on a move? Post a short video. Teachers and members tell you how to fix it."
      >
        <Button render={<Link href="/ask/new" />} className="h-11 w-full text-base">
          Ask for help with a move
        </Button>
      </PageHeader>

      <details className="rounded-lg border p-3" open={Boolean(move || level || show || sort)}>
        <summary className="cursor-pointer text-base font-medium">Filter</summary>
        <form className="mt-3 flex flex-col gap-3">
          <SelectField
            name="move"
            label="Move"
            blank="Any move"
            defaultValue={move}
            options={moves.map((item) => ({ value: item.slug, label: item.name }))}
          />
          <SelectField
            name="level"
            label="Level"
            blank="Any level"
            defaultValue={level}
            options={toOptions(levelLabel, LEVELS)}
          />
          <SelectField
            name="show"
            label="Show"
            blank="All questions"
            defaultValue={show}
            options={[
              { value: "unanswered", label: "No answers yet" },
              { value: "solved", label: "Solved" },
            ]}
          />
          <SelectField
            name="sort"
            label="Order"
            blank="Newest first"
            defaultValue={sort}
            options={[{ value: "top", label: "Most helpful first" }]}
          />
          <Button type="submit" variant="outline" className="h-11 text-base">
            Show
          </Button>
        </form>
      </details>

      {questions.length === 0 ? (
        <EmptyNote>No questions here yet. Be the first to ask.</EmptyNote>
      ) : (
        <div className="flex flex-col">
          {questions.map((question) => (
            <ListLink
              key={question.id as string}
              href={`/ask/${question.id}`}
              title={question.title as string}
              sub={`${levelLabel[question.level as keyof typeof levelLabel]} · ${formatDate(question.created_at as string)}`}
              side={
                question.accepted_answer_id
                  ? "✓ Solved"
                  : `${question.answer_count} ${question.answer_count === 1 ? "answer" : "answers"}`
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
