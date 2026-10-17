import { Suspense } from "react"
import { notFound } from "next/navigation"
import { deleteMove } from "@/app/actions/moves"
import { AdminDenied } from "@/components/admin-denied"
import { PageHeader } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MoveForm, type MoveFormValues } from "@/components/move-form"
import { PageFallback } from "@/components/page-fallback"
import { isAdmin, requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { getMoveOptions } from "@/lib/moves"
import { createClient } from "@/lib/supabase/server"

export default function EditMovePage(props: PageProps<"/admin/moves/[id]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <EditMove params={props.params} />
    </Suspense>
  )
}

async function EditMove({ params }: { params: PageProps<"/admin/moves/[id]">["params"] }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const [{ data: move }, moves, { data: exercises }, aliases, prereqs, links] = await Promise.all([
    supabase.from("moves").select("*").eq("id", id).maybeSingle(),
    getMoveOptions(),
    supabase.from("conditioning_exercises").select("id, name").order("name"),
    supabase.from("move_aliases").select("alias").eq("move_id", id),
    supabase.from("move_prerequisites").select("prerequisite_move_id").eq("move_id", id),
    supabase.from("move_conditioning").select("exercise_id").eq("move_id", id),
  ])
  if (!move) notFound()

  const values: MoveFormValues = {
    ...(move as Omit<MoveFormValues, "aliases" | "prerequisiteIds" | "exerciseIds">),
    aliases: (aliases.data ?? []).map((row) => row.alias as string),
    prerequisiteIds: (prereqs.data ?? []).map((row) => row.prerequisite_move_id as string),
    exerciseIds: (links.data ?? []).map((row) => row.exercise_id as string),
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Edit ${values.name}`} />
      <MoveForm
        ownerId={session.userId}
        moves={moves}
        exercises={(exercises ?? []) as { id: string; name: string }[]}
        move={values}
      />
      <details className="text-sm">
        <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">Delete move</summary>
        <FormShell action={deleteMove} submitLabel="Yes, delete it for good" variant="destructive">
          <input type="hidden" name="moveId" value={id} />
        </FormShell>
      </details>
    </div>
  )
}
