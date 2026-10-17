"use client"

import { useActionState } from "react"
import Link from "next/link"
import { signIn, signInWithGoogle, signUp, type AuthFormState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { copy } from "@/lib/copy"

const fieldClass = "h-11 text-base md:text-base"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export function AuthForm({
  mode,
  nextPath,
  notice,
}: {
  mode: "sign-in" | "sign-up"
  nextPath: string
  notice?: string
}) {
  const action = mode === "sign-in" ? signIn : signUp
  const [state, formAction, pending] = useActionState<AuthFormState | undefined, FormData>(
    action,
    undefined,
  )

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {notice}
        </p>
      ) : null}
      {state?.message ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm" role="status">
          {state.message}
        </p>
      ) : null}
      {state?.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={nextPath} />
        <Button type="submit" variant="outline" className="h-11 w-full text-base">
          {copy.continueWithGoogle}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">{copy.orEmail}</p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={nextPath} />
        {mode === "sign-up" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">{copy.displayName}</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              className={fieldClass}
              aria-invalid={state?.fieldErrors?.displayName ? true : undefined}
            />
            <FieldError message={state?.fieldErrors?.displayName} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{copy.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={fieldClass}
            aria-invalid={state?.fieldErrors?.email ? true : undefined}
          />
          <FieldError message={state?.fieldErrors?.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{copy.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={8}
            className={fieldClass}
            aria-invalid={state?.fieldErrors?.password ? true : undefined}
          />
          <FieldError message={state?.fieldErrors?.password} />
        </div>
        <Button type="submit" disabled={pending} className="h-11 w-full text-base">
          {pending ? copy.saving : mode === "sign-in" ? copy.signIn : copy.createAccount}
        </Button>
      </form>

      <p className="text-center text-base">
        {mode === "sign-in" ? (
          <>
            {copy.needAccount}{" "}
            <Link className="font-medium underline" href="/sign-up">
              {copy.createOne}
            </Link>
          </>
        ) : (
          <>
            {copy.haveAccount}{" "}
            <Link className="font-medium underline" href="/sign-in">
              {copy.goToSignIn}
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
