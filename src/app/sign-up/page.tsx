import { AuthForm } from "@/components/auth-form"
import { SetupNeeded } from "@/components/setup-needed"
import { copy } from "@/lib/copy"
import { hasSupabaseEnv } from "@/lib/supabase/env"

export default function SignUpPage() {
  if (!hasSupabaseEnv()) return <SetupNeeded />

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.signUpTitle}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.signUpLead}</p>
      </div>
      <AuthForm mode="sign-up" nextPath="/profile/edit" />
    </div>
  )
}
