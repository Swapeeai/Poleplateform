"use client"

import { useState } from "react"
import { useActionState } from "react"
import { updateMember, type MemberFormState } from "@/app/actions/members"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { copy } from "@/lib/copy"
import { ROLES, roleLabel, type AppRole, type Member } from "@/lib/profile"

const fieldClass = "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"

export function MemberForm({ member, isYou }: { member: Member; isYou: boolean }) {
  const [state, formAction, pending] = useActionState<MemberFormState | undefined, FormData>(
    updateMember,
    undefined,
  )
  const [role, setRole] = useState<AppRole>(member.role)
  const [verified, setVerified] = useState(member.is_verified_teacher && member.role === "teacher")

  return (
    <form action={formAction} className="flex flex-col gap-3 border-b py-4 last:border-b-0">
      <input type="hidden" name="memberId" value={member.id} />
      <div>
        <p className="text-base font-medium">{member.display_name}</p>
        <p className="text-sm text-muted-foreground">{member.email ?? copy.notSet}</p>
        {isYou ? <p className="mt-1 text-sm text-muted-foreground">{copy.thisIsYou}</p> : null}
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`role-${member.id}`}>{copy.role}</Label>
        <select
          id={`role-${member.id}`}
          name="role"
          value={role}
          onChange={(event) => {
            const next = event.target.value as AppRole
            setRole(next)
            if (next !== "teacher") setVerified(false)
          }}
          className={fieldClass}
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {roleLabel[option]}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.role ? (
          <p className="text-sm text-destructive">{state.fieldErrors.role}</p>
        ) : null}
      </div>

      <label className="flex items-start gap-3 text-base">
        <input
          type="checkbox"
          name="verified"
          value="yes"
          checked={verified}
          disabled={role !== "teacher"}
          onChange={(event) => setVerified(event.target.checked)}
          className="mt-1 size-5"
        />
        <span>
          {copy.verifiedTeacher}
          <span className="mt-1 block text-sm text-muted-foreground">{copy.verifiedHint}</span>
        </span>
      </label>
      {state?.fieldErrors?.verified ? (
        <p className="text-sm text-destructive">{state.fieldErrors.verified}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? copy.saving : copy.save}
      </Button>
    </form>
  )
}
