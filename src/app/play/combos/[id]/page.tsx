import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { deleteCombo } from "@/app/actions/play"
import { AuthorLine, type Author } from "@/components/bits"
import { FormShell } from "@/components/form-shell"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { ReportButton } from "@/components/report-button"
import { isAdmin, requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { createClient } from "@/lib/supabase/server"

type Step = { position: number; transition_note: string; move: { name: string; slug: string } | null }

export default function ComboPage(props: PageProps<"/play/combos/[id]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading combo…" />}>
      <Combo params={props.params} />
    </Suspense>
  )
}

async function Combo({ params }: { params: PageProps<"/play/combos/[id]">["params"] }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const session = await requireUser()
  const supabase = await createClient()

  const { data: combo } = await supabase
    .from("combos")
    .select(
      "id, title, notes, video_id, created_at, author_id, author:profiles(display_name, role, is_verified_teacher, reputation), combo_moves(position, transition_note, move:moves(name, slug))",
    )
    .eq("id", id)
    .maybeSingle()
  if (!combo) notFound()

  const steps = ((combo.combo_moves ?? []) as unknown as Step[]).sort((a, b) => a.position - b.position)
  const isMine = combo.author_id === session.userId

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{combo.title as string}</h1>
        <AuthorLine author={combo.author as unknown as Author} date={combo.created_at as string} />
      </div>

      <MediaView id={combo.video_id as string | null} />

      <ol className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.position} className="flex flex-col rounded-lg border p-3">
            <span className="text-base font-medium">
              {step.position}.{" "}
              {step.move ? (
                <Link className="underline" href={`/moves/${step.move.slug}`}>
                  {step.move.name}
                </Link>
              ) : (
                "Deleted move"
              )}
            </span>
            {step.transition_note ? (
              <span className="text-sm text-muted-foreground">→ {step.transition_note}</span>
            ) : null}
          </li>
        ))}
      </ol>

      {combo.notes ? <p className="whitespace-pre-wrap text-base">{combo.notes as string}</p> : null}

      {!isMine ? <ReportButton targetType="combo" targetId={id} /> : null}
      {isMine || isAdmin(session) ? (
        <details className="text-sm">
          <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">
            Delete combo
          </summary>
          <FormShell action={deleteCombo} submitLabel="Yes, delete it" variant="destructive">
            <input type="hidden" name="comboId" value={id} />
          </FormShell>
        </details>
      ) : null}
    </div>
  )
}
