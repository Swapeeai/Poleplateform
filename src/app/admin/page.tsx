import { Suspense } from "react"
import { AdminDenied } from "@/components/admin-denied"
import { ListLink } from "@/components/bits"
import { PageHeader } from "@/components/fields"
import { PageFallback } from "@/components/page-fallback"
import { isAdmin, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default function AdminPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminHub />
    </Suspense>
  )
}

async function AdminHub() {
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Admin" lead="Everything only you can change." />
      <div className="flex flex-col">
        <ListLink
          href="/admin/reports"
          title="Reports"
          sub="Posts members flagged as a problem"
          side={count ? `${count} open` : "None open"}
        />
        <ListLink href="/admin/moves" title="Moves" sub="Add and edit moves, other names, demo videos" />
        <ListLink href="/admin/courses" title="Courses" sub="Courses, lessons, and who has access" />
        <ListLink href="/admin/challenges/new" title="New weekly challenge" sub="Pick moves and dates" />
        <ListLink href="/play/plans/new" title="Suggested class plan" sub="A plan every teacher can see" />
        <ListLink href="/admin/members" title="Members" sub="Make someone a teacher, verify teachers" />
      </div>
    </div>
  )
}
