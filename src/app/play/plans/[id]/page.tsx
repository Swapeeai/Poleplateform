import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deletePlan } from "@/app/actions/play"
import { FormShell } from "@/components/form-shell"
import { PageFallback } from "@/components/page-fallback"
import { Badge } from "@/components/ui/badge"
import { isAdmin, requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { PLAN_SECTIONS, formatDate, sectionLabel, type PlanSection } from "@/lib/labels"
import { createClient } from "@/lib/supabase/server"

type Item = {
  position: number
  section: PlanSection
  note: string
  move: { name: string; slug: string } | null
  exercise: { name: string } | null
  combo: { id: string; title: string } | null
}

export default function PlanPage(props: PageProps<"/play/plans/[id]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading plan…" />}>
      <Plan params={props.params} />
    </Suspense>
  )
}

async function Plan({ params }: { params: PageProps<"/play/plans/[id]">["params"] }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const session = await requireUser()
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from("class_plans")
    .select(
      "id, title, notes, is_suggested, week_of, author_id, class_plan_items(position, section, note, move:moves(name, slug), exercise:conditioning_exercises(name), combo:combos(id, title))",
    )
    .eq("id", id)
    .maybeSingle()
  if (!plan) notFound()

  const items = ((plan.class_plan_items ?? []) as unknown as Item[]).sort((a, b) => a.position - b.position)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{plan.title as string}</h1>
        <div className="flex flex-wrap gap-2">
          {plan.is_suggested ? <Badge>Suggested by the founder</Badge> : null}
          {plan.week_of ? <Badge variant="outline">Week of {formatDate(plan.week_of as string)}</Badge> : null}
        </div>
      </div>

      {PLAN_SECTIONS.map((section) => {
        const inSection = items.filter((item) => item.section === section)
        if (inSection.length === 0) return null
        return (
          <section key={section} className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{sectionLabel[section]}</h2>
            <ul className="flex flex-col gap-1">
              {inSection.map((item) => (
                <li key={item.position} className="text-base">
                  {item.move ? (
                    <Link className="underline" href={`/moves/${item.move.slug}`}>
                      {item.move.name}
                    </Link>
                  ) : item.exercise ? (
                    item.exercise.name
                  ) : item.combo ? (
                    <Link className="underline" href={`/play/combos/${item.combo.id}`}>
                      {item.combo.title}
                    </Link>
                  ) : null}
                  {item.note ? (
                    <span className="text-muted-foreground">
                      {item.move || item.exercise || item.combo ? " — " : ""}
                      {item.note}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {plan.notes ? <p className="whitespace-pre-wrap text-base">{plan.notes as string}</p> : null}

      {plan.author_id === session.userId || isAdmin(session) ? (
        <details className="text-sm">
          <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">
            Delete plan
          </summary>
          <FormShell action={deletePlan} submitLabel="Yes, delete it" variant="destructive">
            <input type="hidden" name="planId" value={id} />
          </FormShell>
        </details>
      ) : null}
    </div>
  )
}
