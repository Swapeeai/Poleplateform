import { Suspense } from "react"
import { AdminDenied } from "@/components/admin-denied"
import { PageHeader } from "@/components/fields"
import { MoveForm } from "@/components/move-form"
import { PageFallback } from "@/components/page-fallback"
import { isAdmin, requireUser } from "@/lib/auth"
import { getMoveOptions } from "@/lib/moves"
import { createClient } from "@/lib/supabase/server"

export default function NewMovePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <NewMove />
    </Suspense>
  )
}

async function NewMove() {
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const [moves, { data: exercises }] = await Promise.all([
    getMoveOptions(),
    supabase.from("conditioning_exercises").select("id, name").order("name"),
  ])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Add a move" />
      <MoveForm
        ownerId={session.userId}
        moves={moves}
        exercises={(exercises ?? []) as { id: string; name: string }[]}
      />
    </div>
  )
}
