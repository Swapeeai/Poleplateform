import { Suspense } from "react"
import { createChallenge } from "@/app/actions/play"
import { AdminDenied } from "@/components/admin-denied"
import { CheckField, PageHeader, SelectField, TextArea, TextField, toOptions } from "@/components/fields"
import { FormShell } from "@/components/form-shell"
import { MoveSequence } from "@/components/move-sequence"
import { PageFallback } from "@/components/page-fallback"
import { TimezoneField } from "@/components/timezone-field"
import { isAdmin, requireUser } from "@/lib/auth"
import { getMoveOptions } from "@/lib/moves"
import { LEVELS, levelLabel } from "@/lib/profile"

export default function NewChallengePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <NewChallenge />
    </Suspense>
  )
}

async function NewChallenge() {
  const session = await requireUser()
  if (!isAdmin(session)) return <AdminDenied />
  const moves = await getMoveOptions()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="New weekly challenge"
        lead="Pick the moves and the dates. Members can post one video each while it is open."
      />
      <FormShell action={createChallenge} submitLabel="Create challenge">
        <TimezoneField />
        <TextField name="title" label="Name" required maxLength={120} placeholder="Spin week" />
        <SelectField
          name="level"
          label="Level"
          required
          blank="Choose a level"
          options={toOptions(levelLabel, LEVELS)}
        />
        <TextField name="startsAt" label="Opens" type="datetime-local" required />
        <TextField name="endsAt" label="Closes" type="datetime-local" required />
        <MoveSequence moves={moves} label="Moves in the challenge" />
        <CheckField name="ordered" label="Moves must be done in this order" defaultChecked />
        <TextArea name="rules" label="Rules (optional)" maxLength={4000} rows={3} />
      </FormShell>
    </div>
  )
}
