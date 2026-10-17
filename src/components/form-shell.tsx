"use client"

import { useActionState, useEffect, useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { FormState } from "@/lib/form"
import { cn } from "cn"

/**
 * Every form in the app: shows the error or success note the action sends
 * back, and greys out the button while saving.
 */
export function FormShell({
  action,
  submitLabel,
  pendingLabel = "Saving…",
  children,
  className,
  resetOnSuccess = false,
  variant = "default",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  submitLabel: string
  pendingLabel?: string
  children?: ReactNode
  className?: string
  resetOnSuccess?: boolean
  variant?: "default" | "outline" | "secondary" | "destructive"
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (resetOnSuccess && state?.message) formRef.current?.reset()
  }, [resetOnSuccess, state])

  return (
    <form ref={formRef} action={formAction} className={cn("flex flex-col gap-3", className)}>
      {children}
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
      <Button type="submit" disabled={pending} variant={variant} className="h-11 w-full text-base">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}
