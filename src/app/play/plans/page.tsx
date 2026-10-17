import { Suspense } from "react"
import Link from "next/link"
import { EmptyNote, ListLink } from "@/components/bits"
import { PageHeader } from "@/components/fields"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { isTeacher, requireUser } from "@/lib/auth"
import { formatDate } from "@/lib/labels"
import { createClient } from "@/lib/supabase/server"

export default function PlansPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading plans…" />}>
      <Plans />
    </Suspense>
  )
}

async function Plans() {
  const session = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("class_plans")
    .select("id, title, is_suggested, week_of, author_id, created_at")
    .order("created_at", { ascending: false })

  const plans = data ?? []
  const suggested = plans.filter((plan) => plan.is_suggested)
  const mine = plans.filter((plan) => plan.author_id === session.userId && !plan.is_suggested)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Class plans" lead="Plan a class from warm-up to cool-down. Only you see your own plans.">
        {isTeacher(session) ? (
          <Button render={<Link href="/play/plans/new" />} className="h-11 text-base">
            New plan
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Making plans is for teachers. Ask an admin to mark you as a teacher.</p>
        )}
      </PageHeader>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Suggested by the founder</h2>
        {suggested.length === 0 ? <EmptyNote>No suggested plans yet.</EmptyNote> : null}
        {suggested.map((plan) => (
          <ListLink
            key={plan.id as string}
            href={`/play/plans/${plan.id}`}
            title={plan.title as string}
            sub={plan.week_of ? `Week of ${formatDate(plan.week_of as string)}` : undefined}
          />
        ))}
      </section>

      {isTeacher(session) ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">My plans</h2>
          {mine.length === 0 ? <EmptyNote>You have no plans yet.</EmptyNote> : null}
          {mine.map((plan) => (
            <ListLink
              key={plan.id as string}
              href={`/play/plans/${plan.id}`}
              title={plan.title as string}
              sub={plan.week_of ? `Week of ${formatDate(plan.week_of as string)}` : undefined}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}
