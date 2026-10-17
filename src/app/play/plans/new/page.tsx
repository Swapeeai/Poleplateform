import { Suspense } from "react"
import { createPlan } from "@/app/actions/play"
import { EmptyNote } from "@/components/bits"
import { CheckField, PageHeader, TextArea, TextField } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { PageFallback } from "@/components/page-fallback"
import { PlanBuilder } from "@/components/plan-builder"
import { isAdmin, isTeacher, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default function NewPlanPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <NewPlan />
    </Suspense>
  )
}

async function NewPlan() {
  const session = await requireUser()
  if (!isTeacher(session)) return <EmptyNote>Making plans is for teachers.</EmptyNote>

  const supabase = await createClient()
  const [moves, exercises, combos] = await Promise.all([
    supabase.from("moves").select("id, name").order("name"),
    supabase.from("conditioning_exercises").select("id, name").order("name"),
    supabase.from("combos").select("id, title").order("created_at", { ascending: false }).limit(100),
  ])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New class plan" />
      <FormShell action={createPlan} submitLabel="Save plan">
        <TextField name="title" label="Name" required maxLength={120} placeholder="Beginner inverts, week 3" />
        <TextField name="weekOf" label="Week of (optional)" type="date" />
        <PlanBuilder
          moves={(moves.data ?? []) as { id: string; name: string }[]}
          exercises={(exercises.data ?? []) as { id: string; name: string }[]}
          combos={(combos.data ?? []).map((combo) => ({ id: combo.id as string, name: combo.title as string }))}
        />
        <TextArea name="notes" label="Notes (optional)" maxLength={4000} rows={3} />
        {isAdmin(session) ? (
          <CheckField
            name="suggested"
            label="Suggest this plan to every teacher"
            hint="Only admins see this box."
          />
        ) : null}
      </FormShell>
    </div>
  )
}
