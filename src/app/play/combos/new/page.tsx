import { Suspense } from "react"
import { createCombo } from "@/app/actions/play"
import { PageHeader, TextArea, TextField } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MediaUpload } from "@/components/media-upload"
import { MoveSequence } from "@/components/move-sequence"
import { PageFallback } from "@/components/page-fallback"
import { requireUser } from "@/lib/auth"
import { CLIP_LIMITS } from "@/lib/labels"
import { getMoveOptions } from "@/lib/moves"

export default function NewComboPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <NewCombo />
    </Suspense>
  )
}

async function NewCombo() {
  const session = await requireUser()
  const moves = await getMoveOptions()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Make a combo" lead="Pick moves in order and say how you get from one to the next." />
      <FormShell action={createCombo} submitLabel="Save combo">
        <TextField name="title" label="Name" required maxLength={120} placeholder="Spin into climb flow" />
        <MoveSequence moves={moves} withNotes />
        <TextArea name="comboNotes" label="Notes (optional)" maxLength={2000} rows={3} />
        <MediaUpload
          name="videoId"
          ownerId={session.userId}
          kind="video"
          label="Video of the combo (optional)"
          hint="Up to 3 minutes."
          maxSeconds={CLIP_LIMITS.combo}
        />
      </FormShell>
    </div>
  )
}
