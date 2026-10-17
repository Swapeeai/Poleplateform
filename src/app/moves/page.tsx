import { Suspense } from "react"
import Link from "next/link"
import { EmptyNote, ListLink } from "@/components/bits"
import { PageHeader, SelectField, toOptions } from "@/components/fields"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isAdmin, requireUser } from "@/lib/auth"
import { MOVE_CATEGORIES, categoryLabel, isOneOf, type MoveCategory } from "@/lib/labels"
import { LEVELS, isLevel, levelLabel, type DanceLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

export default function MovesPage(props: PageProps<"/moves">) {
  return (
    <Suspense fallback={<PageFallback label="Loading moves…" />}>
      <MoveList searchParams={props.searchParams} />
    </Suspense>
  )
}

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : ""
}

const statusLabel: Record<string, string> = { working_on: "Working on it", got_it: "✓ Got it" }

type MoveRow = {
  id: string
  name: string
  slug: string
  category: MoveCategory
  level: DanceLevel
  base_move_id: string | null
}

async function MoveList({ searchParams }: { searchParams: PageProps<"/moves">["searchParams"] }) {
  const session = await requireUser()
  const params = await searchParams
  const q = one(params.q).slice(0, 80)
  const category = one(params.category)
  const level = one(params.level)
  const mine = one(params.show) === "mine"

  const supabase = await createClient()
  let query = supabase.rpc("search_moves", { query: q }).select("id, name, slug, category, level, base_move_id")
  if (isOneOf(MOVE_CATEGORIES, category)) query = query.eq("category", category)
  if (isLevel(level)) query = query.eq("level", level)

  const [{ data: moveRows }, { data: savedRows }] = await Promise.all([
    query,
    supabase.from("saved_moves").select("move_id, status").eq("user_id", session.userId),
  ])
  const saved = new Map((savedRows ?? []).map((row) => [row.move_id as string, row.status as string]))
  const moves = ((moveRows ?? []) as MoveRow[]).filter((move) => !mine || saved.has(move.id))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Move dictionary"
        lead="Every move with a demo, what to learn first, and common mistakes. Search any name your studio uses."
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            render={<Link href="/moves" />}
            variant={mine ? "outline" : "default"}
            className="h-11 text-base"
          >
            All moves
          </Button>
          <Button
            render={<Link href="/moves?show=mine" />}
            variant={mine ? "default" : "outline"}
            className="h-11 text-base"
          >
            My moves
          </Button>
        </div>
        {isAdmin(session) ? (
          <Button render={<Link href="/admin/moves/new" />} variant="secondary" className="h-11 text-base">
            Add a move
          </Button>
        ) : null}
      </PageHeader>

      <form className="flex flex-col gap-3">
        {mine ? <input type="hidden" name="show" value="mine" /> : null}
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search, e.g. Ayesha or Gemini"
          aria-label="Search moves"
          className="h-11 text-base"
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            name="category"
            label="Type"
            blank="All types"
            defaultValue={category}
            options={toOptions(categoryLabel, MOVE_CATEGORIES)}
          />
          <SelectField
            name="level"
            label="Level"
            blank="All levels"
            defaultValue={level}
            options={toOptions(levelLabel, LEVELS)}
          />
        </div>
        <Button type="submit" variant="outline" className="h-11 text-base">
          Search
        </Button>
      </form>

      {moves.length === 0 ? (
        <EmptyNote>
          {mine
            ? "Your list is empty. Open a move and tap Working on it."
            : "No move found. Try another name."}
        </EmptyNote>
      ) : (
        <div className="flex flex-col">
          {moves.map((move) => (
            <ListLink
              key={move.id}
              href={`/moves/${move.slug}`}
              title={move.name}
              sub={`${categoryLabel[move.category]} · ${levelLabel[move.level]}${move.base_move_id ? " · Variation" : ""}`}
              side={statusLabel[saved.get(move.id) ?? ""]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
