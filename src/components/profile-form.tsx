"use client"

import { useActionState } from "react"
import { updateProfile, type ProfileFormState } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { copy } from "@/lib/copy"
import { LEVELS, levelLabel, type Profile } from "@/lib/profile"

const fieldClass = "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ProfileFormState | undefined, FormData>(
    updateProfile,
    undefined,
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">{copy.displayName}</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          className="h-11 text-base md:text-base"
          aria-invalid={state?.fieldErrors?.displayName ? true : undefined}
        />
        <FieldError message={state?.fieldErrors?.displayName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="avatarUrl">{copy.avatar}</Label>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://"
          className="h-11 text-base md:text-base"
          aria-invalid={state?.fieldErrors?.avatarUrl ? true : undefined}
        />
        <p className="text-sm text-muted-foreground">{copy.avatarHint}</p>
        <FieldError message={state?.fieldErrors?.avatarUrl} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="country">{copy.country}</Label>
        <Input
          id="country"
          name="country"
          defaultValue={profile.country ?? ""}
          required
          autoComplete="country-name"
          className="h-11 text-base md:text-base"
          aria-invalid={state?.fieldErrors?.country ? true : undefined}
        />
        <FieldError message={state?.fieldErrors?.country} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="level">{copy.level}</Label>
        <select
          id="level"
          name="level"
          defaultValue={profile.level ?? ""}
          required
          className={fieldClass}
          aria-invalid={state?.fieldErrors?.level ? true : undefined}
        >
          <option value="">{copy.chooseLevel}</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {levelLabel[level]}
            </option>
          ))}
        </select>
        <FieldError message={state?.fieldErrors?.level} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="yearsDancing">{copy.yearsDancing}</Label>
        <Input
          id="yearsDancing"
          name="yearsDancing"
          type="number"
          inputMode="numeric"
          min={0}
          max={80}
          required
          defaultValue={profile.years_dancing ?? ""}
          className="h-11 text-base md:text-base"
          aria-invalid={state?.fieldErrors?.yearsDancing ? true : undefined}
        />
        <p className="text-sm text-muted-foreground">{copy.yearsHint}</p>
        <FieldError message={state?.fieldErrors?.yearsDancing} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="teacherStudio">
          {copy.teacherStudio} <span className="font-normal text-muted-foreground">({copy.optional})</span>
        </Label>
        <Input
          id="teacherStudio"
          name="teacherStudio"
          defaultValue={profile.teacher_studio ?? ""}
          maxLength={120}
          className="h-11 text-base md:text-base"
          aria-invalid={state?.fieldErrors?.teacherStudio ? true : undefined}
        />
        <p className="text-sm text-muted-foreground">{copy.studioHint}</p>
        <FieldError message={state?.fieldErrors?.teacherStudio} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instagram">
          {copy.instagram} <span className="font-normal text-muted-foreground">({copy.optional})</span>
        </Label>
        <Input
          id="instagram"
          name="instagram"
          defaultValue={profile.instagram ?? ""}
          autoCapitalize="none"
          className="h-11 text-base md:text-base"
          aria-invalid={state?.fieldErrors?.instagram ? true : undefined}
        />
        <p className="text-sm text-muted-foreground">{copy.instagramHint}</p>
        <FieldError message={state?.fieldErrors?.instagram} />
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.reputation}: {profile.reputation}. {copy.reputationHint}
      </p>

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? copy.saving : copy.save}
      </Button>
    </form>
  )
}
