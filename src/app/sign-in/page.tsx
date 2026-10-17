import { Suspense } from "react"
import { AuthForm } from "@/components/auth-form"
import { PageFallback } from "@/components/page-fallback"
import { SetupNeeded } from "@/components/setup-needed"
import { copy } from "@/lib/copy"
import { safeNextPath } from "@/lib/profile-fields"
import { hasSupabaseEnv } from "@/lib/supabase/env"

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  if (!hasSupabaseEnv()) return <SetupNeeded />

  return (
    <Suspense fallback={<PageFallback label="Loading sign in…" />}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  )
}

async function SignInContent({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const error = typeof params.error === "string" ? params.error : undefined
  const notice =
    error === "google" ? copy.googleFailed : error === "auth" ? copy.linkFailed : undefined
  const nextPath = safeNextPath(typeof params.next === "string" ? params.next : "/")

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.signInTitle}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.signInLead}</p>
      </div>
      <AuthForm mode="sign-in" nextPath={nextPath} notice={notice} />
    </div>
  )
}
