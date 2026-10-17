import { Suspense } from "react"
import { askQuestion } from "@/app/actions/ask"
import { PageHeader, SelectField, TextArea, TextField, toOptions } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { MovePicker } from "@/components/move-picker"
import { PageFallback } from "@/components/page-fallback"
import { requireUser } from "@/lib/auth"
import { CLIP_LIMITS } from "@/lib/labels"
import { getMoveOptions } from "@/lib/moves"
import { LEVELS, levelLabel } from "@/lib/profile"

export default function NewQuestionPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <NewQuestion />
    </Suspense>
  )
}

async function NewQuestion() {
  const session = await requireUser()
  const moves = await getMoveOptions()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ask for help"
        lead="Film yourself trying the move, from the side if you can. Keep it under 90 seconds."
      />
      <FormShell action={askQuestion} submitLabel="Post my question" pendingLabel="Posting…">
        <MediaUpload
          name="videoId"
          ownerId={session.userId}
          kind="video"
          label="Your video (required)"
          hint="Up to 90 seconds. All members can see it."
          maxSeconds={CLIP_LIMITS.question}
          required
        />
        <TextField
          name="title"
          label="What is the problem?"
          placeholder="My Ayesha drops at the end"
          required
          maxLength={140}
        />
        <MovePicker moves={moves} />
        <SelectField
          name="level"
          label="Your level"
          required
          blank="Choose a level"
          defaultValue={session.profile?.level}
          options={toOptions(levelLabel, LEVELS)}
        />
        <TextArea name="body" label="More details (optional)" maxLength={4000} />
        <TextArea
          name="tried"
          label="What have you tried already? (optional)"
          maxLength={2000}
          rows={3}
        />
      </FormShell>
    </div>
  )
}
