"use client"

import { useActionState } from "react"
import { castVote } from "@/app/actions/community"
import { Button } from "@/components/ui/button"

/**
 * Up and down arrows with the score between them. The arrow you already
 * pressed is filled in; pressing it again takes your vote back.
 */
export function VoteButtons({
  targetType,
  targetId,
  score,
  myVote,
  path,
  disabled = false,
}: {
  targetType: "question" | "answer" | "challenge_entry"
  targetId: string
  score: number
  myVote: number
  path: string
  disabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(castVote, undefined)

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="path" value={path} />
      <div className="flex items-center gap-1">
        <Button
          type="submit"
          name="value"
          value="1"
          variant={myVote === 1 ? "default" : "outline"}
          disabled={pending || disabled}
          className="h-11 min-w-11"
          aria-label="Helpful"
        >
          ▲
        </Button>
        <span className="min-w-8 text-center text-base font-medium" aria-label="Score">
          {score}
        </span>
        <Button
          type="submit"
          name="value"
          value="-1"
          variant={myVote === -1 ? "default" : "outline"}
          disabled={pending || disabled}
          className="h-11 min-w-11"
          aria-label="Not helpful"
        >
          ▼
        </Button>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
