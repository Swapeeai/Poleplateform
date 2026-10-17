import { Suspense } from "react"
import Link from "next/link"
import { connection } from "next/server"
import { EmptyNote, ListLink } from "@/components/bits"
import { PageHeader } from "@/components/fields"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { isAdmin, isTeacher, requireUser } from "@/lib/auth"
import { formatDate } from "@/lib/labels"
import { createClient } from "@/lib/supabase/server"

export default function PlayPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading…" />}>
      <PlayHub />
    </Suspense>
  )
}

async function PlayHub() {
  const session = await requireUser()
  await connection()
  const now = new Date().toISOString()
  const supabase = await createClient()

  const [open, upcoming, past, combos] = await Promise.all([
    supabase.from("challenges").select("id, title, ends_at").lte("starts_at", now).gte("ends_at", now).order("ends_at"),
    supabase.from("challenges").select("id, title, starts_at").gt("starts_at", now).order("starts_at").limit(5),
    supabase.from("challenges").select("id, title, ends_at").lt("ends_at", now).order("ends_at", { ascending: false }).limit(20),
    supabase
      .from("combos")
      .select("id, title, created_at, author:profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Play" lead="String moves into combos, join the weekly challenge, and plan classes." />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">This week&apos;s challenge</h2>
        {(open.data ?? []).length === 0 ? (
          <EmptyNote>No challenge is open right now. Check back soon.</EmptyNote>
        ) : (
          (open.data ?? []).map((challenge) => (
            <ListLink
              key={challenge.id as string}
              href={`/play/challenges/${challenge.id}`}
              title={challenge.title as string}
              sub={`Open until ${formatDate(challenge.ends_at as string)}`}
              side="Join →"
            />
          ))
        )}
        {(upcoming.data ?? []).map((challenge) => (
          <ListLink
            key={challenge.id as string}
            href={`/play/challenges/${challenge.id}`}
            title={challenge.title as string}
            sub={`Starts ${formatDate(challenge.starts_at as string)}`}
          />
        ))}
        {isAdmin(session) ? (
          <Button render={<Link href="/admin/challenges/new" />} variant="secondary" className="h-11 text-base">
            New challenge
          </Button>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Combos</h2>
        <Button render={<Link href="/play/combos/new" />} className="h-11 text-base">
          Make a combo
        </Button>
        {(combos.data ?? []).length === 0 ? (
          <EmptyNote>No combos yet. Make the first one.</EmptyNote>
        ) : (
          (combos.data ?? []).map((combo) => (
            <ListLink
              key={combo.id as string}
              href={`/play/combos/${combo.id}`}
              title={combo.title as string}
              sub={(combo.author as unknown as { display_name: string } | null)?.display_name}
            />
          ))
        )}
      </section>

      {isTeacher(session) ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Class plans</h2>
          <p className="text-sm text-muted-foreground">For teachers: plan a class from warm-up to cool-down.</p>
          <Button render={<Link href="/play/plans" />} variant="outline" className="h-11 text-base">
            My class plans
          </Button>
        </section>
      ) : null}

      {(past.data ?? []).length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Past challenges</h2>
          {(past.data ?? []).map((challenge) => (
            <ListLink
              key={challenge.id as string}
              href={`/play/challenges/${challenge.id}`}
              title={challenge.title as string}
              sub={`Ended ${formatDate(challenge.ends_at as string)}`}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}
