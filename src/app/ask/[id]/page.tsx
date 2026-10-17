import { Suspense } from "react"
import { notFound } from "next/navigation"
import {
  addComment,
  addSuccessVideo,
  answerQuestion,
  deleteAnswer,
  deleteComment,
  deleteQuestion,
  markHelpful,
} from "@/app/actions/ask"
import { AuthorLine, MoveChips, type Author } from "@/components/bits"
import { CheckField, TextArea } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { MediaView } from "@/components/media-view"
import { PageFallback } from "@/components/page-fallback"
import { ReportButton } from "@/components/report-button"
import { Badge } from "@/components/ui/badge"
import { VoteButtons } from "@/components/vote-buttons"
import { isAdmin, isTeacher, requireUser } from "@/lib/auth"
import { isUuid } from "@/lib/form"
import { CLIP_LIMITS } from "@/lib/labels"
import { getTaggedMoves } from "@/lib/moves"
import { levelLabel, type DanceLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

const AUTHOR = "author:profiles(display_name, role, is_verified_teacher, reputation)"

type Comment = { id: string; body: string; created_at: string; author_id: string; author: Author }
type Answer = {
  id: string
  body: string
  video_id: string | null
  is_technique: boolean
  is_conditioning: boolean
  score: number
  created_at: string
  author_id: string
  author: Author
  comments: Comment[]
}

export default function QuestionPage(props: PageProps<"/ask/[id]">) {
  return (
    <Suspense fallback={<PageFallback label="Loading question…" />}>
      <Question params={props.params} />
    </Suspense>
  )
}

async function Question({ params }: { params: PageProps<"/ask/[id]">["params"] }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const session = await requireUser()
  const supabase = await createClient()

  const { data: question } = await supabase
    .from("questions")
    .select(`id, title, body, tried, level, video_id, accepted_answer_id, success_video_id, score, created_at, author_id, ${AUTHOR}`)
    .eq("id", id)
    .maybeSingle()
  if (!question) notFound()

  const { data: answerRows } = await supabase
    .from("answers")
    .select(
      `id, body, video_id, is_technique, is_conditioning, score, created_at, author_id, ${AUTHOR}, comments(id, body, created_at, author_id, ${AUTHOR})`,
    )
    .eq("question_id", id)

  const accepted = question.accepted_answer_id as string | null
  const answers = ((answerRows ?? []) as unknown as Answer[]).sort((a, b) => {
    if (a.id === accepted) return -1
    if (b.id === accepted) return 1
    return b.score - a.score || a.created_at.localeCompare(b.created_at)
  })

  const { data: voteRows } = await supabase
    .from("votes")
    .select("target_id, value")
    .eq("user_id", session.userId)
    .in("target_id", [id, ...answers.map((answer) => answer.id)])
  const myVote = new Map((voteRows ?? []).map((vote) => [vote.target_id as string, vote.value as number]))

  const moves = await getTaggedMoves("question", id)
  const path = `/ask/${id}`
  const isAsker = question.author_id === session.userId
  const canModerate = isAdmin(session)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{question.title as string}</h1>
        <AuthorLine author={question.author as unknown as Author} date={question.created_at as string} />
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{levelLabel[question.level as DanceLevel]}</Badge>
          {accepted ? <Badge>✓ Solved</Badge> : null}
        </div>
        <MoveChips moves={moves} />
        <MediaView id={question.video_id as string} />
        {question.body ? <p className="whitespace-pre-wrap text-base">{question.body as string}</p> : null}
        {question.tried ? (
          <div>
            <p className="text-sm font-medium">What I tried</p>
            <p className="whitespace-pre-wrap text-base text-muted-foreground">{question.tried as string}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VoteButtons
            targetType="question"
            targetId={id}
            score={question.score as number}
            myVote={myVote.get(id) ?? 0}
            path={path}
            disabled={isAsker}
          />
          {!isAsker ? <ReportButton targetType="question" targetId={id} /> : null}
        </div>
        {isAsker || canModerate ? (
          <details className="text-sm">
            <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">
              Delete question
            </summary>
            <FormShell action={deleteQuestion} submitLabel="Yes, delete it for good" variant="destructive">
              <input type="hidden" name="questionId" value={id} />
            </FormShell>
          </details>
        ) : null}
      </section>

      {question.success_video_id ? (
        <section className="flex flex-col gap-2 rounded-lg border-2 border-primary/30 p-3">
          <h2 className="text-lg font-semibold">I got it! 🎉</h2>
          <MediaView id={question.success_video_id as string} />
        </section>
      ) : isAsker && accepted ? (
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h2 className="text-lg font-semibold">Got the move now?</h2>
          <p className="text-sm text-muted-foreground">Share a video of it working. It helps the next person.</p>
          <FormShell action={addSuccessVideo} submitLabel="Post my success video">
            <input type="hidden" name="questionId" value={id} />
            <MediaUpload
              name="videoId"
              ownerId={session.userId}
              kind="video"
              label="Success video"
              maxSeconds={CLIP_LIMITS.question}
              required
            />
          </FormShell>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {answers.length} {answers.length === 1 ? "answer" : "answers"}
        </h2>
        {answers.map((answer) => (
          <article
            key={answer.id}
            className={`flex flex-col gap-3 rounded-lg border p-3 ${answer.id === accepted ? "border-2 border-primary" : ""}`}
          >
            <div className="flex flex-wrap gap-2">
              {answer.id === accepted ? <Badge>✓ This helped</Badge> : null}
              {answer.is_technique ? <Badge variant="outline">Technique fix</Badge> : null}
              {answer.is_conditioning ? <Badge variant="outline">Strength / flexibility</Badge> : null}
            </div>
            <AuthorLine author={answer.author} date={answer.created_at} />
            <p className="whitespace-pre-wrap text-base">{answer.body}</p>
            <MediaView id={answer.video_id} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <VoteButtons
                targetType="answer"
                targetId={answer.id}
                score={answer.score}
                myVote={myVote.get(answer.id) ?? 0}
                path={path}
                disabled={answer.author_id === session.userId}
              />
              {answer.author_id !== session.userId ? (
                <ReportButton targetType="answer" targetId={answer.id} />
              ) : null}
            </div>
            {isAsker ? (
              <FormShell
                action={markHelpful}
                submitLabel={answer.id === accepted ? "Un-mark" : "✓ This fixed it"}
                variant={answer.id === accepted ? "outline" : "secondary"}
              >
                <input type="hidden" name="questionId" value={id} />
                <input type="hidden" name="answerId" value={answer.id} />
              </FormShell>
            ) : null}
            {answer.author_id === session.userId || canModerate ? (
              <details className="text-sm">
                <summary className="inline-flex h-11 cursor-pointer items-center text-muted-foreground">
                  Delete answer
                </summary>
                <FormShell action={deleteAnswer} submitLabel="Yes, delete it" variant="destructive">
                  <input type="hidden" name="questionId" value={id} />
                  <input type="hidden" name="answerId" value={answer.id} />
                </FormShell>
              </details>
            ) : null}

            <div className="flex flex-col gap-2 border-l-2 pl-3">
              {answer.comments
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-1">
                    <AuthorLine author={comment.author} date={comment.created_at} />
                    <p className="whitespace-pre-wrap text-base">{comment.body}</p>
                    <div className="flex gap-3">
                      {comment.author_id !== session.userId ? (
                        <ReportButton targetType="comment" targetId={comment.id} />
                      ) : null}
                      {comment.author_id === session.userId || canModerate ? (
                        <FormShell action={deleteComment} submitLabel="Delete" variant="outline" className="w-24">
                          <input type="hidden" name="questionId" value={id} />
                          <input type="hidden" name="commentId" value={comment.id} />
                        </FormShell>
                      ) : null}
                    </div>
                  </div>
                ))}
              <FormShell action={addComment} submitLabel="Reply" variant="outline" resetOnSuccess>
                <input type="hidden" name="questionId" value={id} />
                <input type="hidden" name="answerId" value={answer.id} />
                <textarea
                  name="body"
                  required
                  maxLength={1000}
                  rows={2}
                  aria-label="Reply"
                  placeholder="Ask a follow-up or add a tip"
                  className="w-full rounded-lg border border-input bg-transparent p-2.5 text-base"
                />
              </FormShell>
            </div>
          </article>
        ))}
      </section>

      {!isAsker ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Your advice</h2>
          <FormShell action={answerQuestion} submitLabel="Post answer" pendingLabel="Posting…" resetOnSuccess>
            <input type="hidden" name="questionId" value={id} />
            <TextArea
              name="body"
              label="How to fix it"
              required
              maxLength={4000}
              placeholder="What do you see, and what should they change?"
            />
            <MediaUpload
              name="videoId"
              ownerId={session.userId}
              kind="video"
              label="Show it (optional)"
              hint="A short video of the fix. Up to 90 seconds."
              maxSeconds={CLIP_LIMITS.question}
            />
            {isTeacher(session) ? (
              <>
                <CheckField name="technique" label="This is a technique fix" />
                <CheckField
                  name="conditioning"
                  label="This needs strength or flexibility work"
                  hint="Only teachers see these two boxes."
                />
              </>
            ) : null}
          </FormShell>
        </section>
      ) : null}
    </div>
  )
}
