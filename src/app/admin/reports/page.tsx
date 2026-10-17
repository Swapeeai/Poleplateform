import { Suspense } from "react"
import Link from "next/link"
import { closeReport } from "@/app/actions/community"
import { AdminDenied } from "@/components/admin-denied"
import { EmptyNote } from "@/components/bits"
import { PageHeader } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { PageFallback } from "@/components/page-fallback"
import { isAdmin, requireUser } from "@/lib/auth"
import { formatDate } from "@/lib/labels"
import { createClient } from "@/lib/supabase/server"

type Report = {
  id: string
  target_type: string
  target_id: string
  reason: string
  created_at: string
  reporter: { display_name: string } | null
}

const typeLabel: Record<string, string> = {
  question: "Question",
  answer: "Answer",
  comment: "Comment",
  combo: "Combo",
  challenge_entry: "Challenge entry",
  media: "Video or picture",
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Reports />
    </Suspense>
  )
}

async function Reports() {
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />

  const supabase = await createClient()
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
  const reports = (data ?? []) as unknown as Report[]
  const links = await Promise.all(reports.map((report) => findLink(report)))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        lead="Open the post, delete it there if needed, then mark the report as handled."
      />
      {reports.length === 0 ? <EmptyNote>Nothing to check. All good.</EmptyNote> : null}
      {reports.map((report, index) => (
        <article key={report.id} className="flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">
            {typeLabel[report.target_type] ?? report.target_type} · reported by{" "}
            {report.reporter?.display_name ?? "a former member"} · {formatDate(report.created_at)}
          </p>
          <p className="text-base">“{report.reason}”</p>
          {links[index] ? (
            <Link className="text-base underline" href={links[index]}>
              Open it
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">It has already been deleted.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <FormShell action={closeReport} submitLabel="Handled">
              <input type="hidden" name="reportId" value={report.id} />
              <input type="hidden" name="status" value="resolved" />
            </FormShell>
            <FormShell action={closeReport} submitLabel="Dismiss" variant="outline">
              <input type="hidden" name="reportId" value={report.id} />
              <input type="hidden" name="status" value="dismissed" />
            </FormShell>
          </div>
        </article>
      ))}
    </div>
  )
}

/** Where the reported thing can be seen, or null if it is gone. */
async function findLink(report: Report): Promise<string | null> {
  const supabase = await createClient()
  const id = report.target_id
  switch (report.target_type) {
    case "question": {
      const { data } = await supabase.from("questions").select("id").eq("id", id).maybeSingle()
      return data ? `/ask/${id}` : null
    }
    case "answer": {
      const { data } = await supabase.from("answers").select("question_id").eq("id", id).maybeSingle()
      return data ? `/ask/${data.question_id}` : null
    }
    case "comment": {
      const { data } = await supabase.from("comments").select("answers(question_id)").eq("id", id).maybeSingle()
      const answer = data?.answers as unknown as { question_id: string } | null
      return answer ? `/ask/${answer.question_id}` : null
    }
    case "combo": {
      const { data } = await supabase.from("combos").select("id").eq("id", id).maybeSingle()
      return data ? `/play/combos/${id}` : null
    }
    case "challenge_entry": {
      const { data } = await supabase.from("challenge_entries").select("challenge_id").eq("id", id).maybeSingle()
      return data ? `/play/challenges/${data.challenge_id}` : null
    }
    default:
      return null
  }
}
