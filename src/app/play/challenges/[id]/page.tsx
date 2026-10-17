import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { deleteEntry, enterChallenge, featureEntry } from "@/app/actions/play"
import { AuthorLine, EmptyNote, type Author } from "@/components/bits"
import { TextField } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { ReportButton } from "@/components/report-button"
import { Badge } from "@/components/ui/badge"
import { VoteButtons } from "@/components/vote-buttons"
import { isAdmin, requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { CLIP_LIMITS, challengeStatus, formatDate } from "@/lib/labels"
import { levelLabel, type DanceLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

type Entry = {
  id: string
  user_id: string
  video_id: string
  note: string
  is_featured: boolean
  score: number
  created_at: string
  member: Author
}

export default function ChallengePage(props: PageProps<"/play/challenges/[id]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading challenge…" />}>
      <Challenge params={props.params} />
    </Suspense>
  )
}

async function Challenge({ params }: { params: PageProps<"/play/challenges/[id]">["params"] }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const session = await requireUser()
  await connection()
  const supabase = await createClient()

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, title, rules, level, starts_at, ends_at, is_ordered, challenge_moves(position, move:moves(name, slug))")
    .eq("id", id)
    .maybeSingle()
  if (!challenge) notFound()

  const { data: entryRows } = await supabase
    .from("challenge_entries")
    .select("id, user_id, video_id, note, is_featured, score, created_at, member:profiles(display_name, role, is_verified_teacher, reputation)")
    .eq("challenge_id", id)
  const entries = ((entryRows ?? []) as unknown as Entry[]).sort(
    (a, b) => Number(b.is_featured) - Number(a.is_featured) || b.score - a.score,
  )

  const { data: voteRows } = await supabase
    .from("votes")
    .select("target_id, value")
    .eq("user_id", session.userId)
    .eq("target_type", "challenge_entry")
    .in("target_id", entries.map((entry) => entry.id))
  const myVote = new Map((voteRows ?? []).map((vote) => [vote.target_id as string, vote.value as number]))

  const status = challengeStatus(challenge.starts_at as string, challenge.ends_at as string)
  const isOpen = status === "open"
  const notStarted = status === "upcoming"
  const entered = entries.some((entry) => entry.user_id === session.userId)
  const moves = ((challenge.challenge_moves ?? []) as unknown as { position: number; move: { name: string; slug: string } | null }[])
    .sort((a, b) => a.position - b.position)
  const path = `/play/challenges/${id}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{challenge.title as string}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{levelLabel[challenge.level as DanceLevel]}</Badge>
          <Badge variant={isOpen ? "default" : "outline"}>
            {isOpen ? "Open now" : notStarted ? "Not started" : "Finished"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(challenge.starts_at as string)} – {formatDate(challenge.ends_at as string)}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {challenge.is_ordered ? "Do these moves, in this order" : "Use these moves, any order"}
        </h2>
        <ol className="flex flex-col gap-1">
          {moves.map((item) => (
            <li key={item.position} className="text-base">
              {item.position}.{" "}
              {item.move ? (
                <Link className="underline" href={`/moves/${item.move.slug}`}>
                  {item.move.name}
                </Link>
              ) : (
                "Deleted move"
              )}
            </li>
          ))}
        </ol>
        {challenge.rules ? <p className="whitespace-pre-wrap text-base">{challenge.rules as string}</p> : null}
      </section>

      {isOpen && !entered ? (
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h2 className="text-lg font-semibold">Enter</h2>
          <FormShell action={enterChallenge} submitLabel="Post my entry" pendingLabel="Posting…">
            <input type="hidden" name="challengeId" value={id} />
            <MediaUpload
              name="videoId"
              ownerId={session.userId}
              kind="video"
              label="Your video"
              hint="Up to 3 minutes. One entry per person."
              maxSeconds={CLIP_LIMITS.challenge}
              required
            />
            <TextField name="note" label="A note (optional)" maxLength={500} />
          </FormShell>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </h2>
        {entries.length === 0 ? <EmptyNote>No entries yet.</EmptyNote> : null}
        {entries.map((entry) => (
          <article key={entry.id} className={`flex flex-col gap-2 rounded-lg border p-3 ${entry.is_featured ? "border-2 border-primary" : ""}`}>
            {entry.is_featured ? <Badge>★ Featured</Badge> : null}
            <AuthorLine author={entry.member} date={entry.created_at} />
            <MediaView id={entry.video_id} />
            {entry.note ? <p className="text-base">{entry.note}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <VoteButtons
                targetType="challenge_entry"
                targetId={entry.id}
                score={entry.score}
                myVote={myVote.get(entry.id) ?? 0}
                path={path}
                disabled={entry.user_id === session.userId}
              />
              {entry.user_id !== session.userId ? (
                <ReportButton targetType="challenge_entry" targetId={entry.id} />
              ) : null}
            </div>
            {isAdmin(session) ? (
              <FormShell
                action={featureEntry}
                submitLabel={entry.is_featured ? "Remove from featured" : "★ Feature this entry"}
                variant="secondary"
              >
                <input type="hidden" name="entryId" value={entry.id} />
                <input type="hidden" name="challengeId" value={id} />
                <input type="hidden" name="featured" value={entry.is_featured ? "no" : "yes"} />
              </FormShell>
            ) : null}
            {entry.user_id === session.userId || isAdmin(session) ? (
              <details className="text-sm">
                <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">
                  Delete entry
                </summary>
                <FormShell action={deleteEntry} submitLabel="Yes, delete it" variant="destructive">
                  <input type="hidden" name="entryId" value={entry.id} />
                  <input type="hidden" name="challengeId" value={id} />
                </FormShell>
              </details>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}
