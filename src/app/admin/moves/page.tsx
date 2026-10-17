import { Suspense } from "react"
import Link from "next/link"
import { addExercise } from "@/app/actions/moves"
import { AdminDenied } from "@/components/admin-denied"
import { ListLink } from "@/components/bits"
import { PageHeader, TextField } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { isAdmin, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default function AdminMovesPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminMoves />
    </Suspense>
  )
}

async function AdminMoves() {
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const [{ data: moves }, { data: exercises }] = await Promise.all([
    supabase.from("moves").select("id, name, demo_video_id").order("name"),
    supabase.from("conditioning_exercises").select("id, name").order("name"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Moves" lead={`${(moves ?? []).length} moves in the dictionary.`}>
        <Button render={<Link href="/admin/moves/new" />} className="h-11 text-base">
          Add a move
        </Button>
      </PageHeader>

      <div className="flex flex-col">
        {(moves ?? []).map((move) => (
          <ListLink
            key={move.id as string}
            href={`/admin/moves/${move.id}`}
            title={move.name as string}
            side={move.demo_video_id ? "Has video" : "No video yet"}
          />
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Strength and flexibility exercises</h2>
        <p className="text-base text-muted-foreground">
          {(exercises ?? []).map((exercise) => exercise.name as string).join(", ") || "None yet."}
        </p>
        <FormShell action={addExercise} submitLabel="Add exercise" variant="outline" resetOnSuccess>
          <TextField name="name" label="New exercise" required maxLength={80} placeholder="Hollow body hold" />
          <TextField name="description" label="How to do it (optional)" maxLength={2000} />
        </FormShell>
      </section>
    </div>
  )
}
