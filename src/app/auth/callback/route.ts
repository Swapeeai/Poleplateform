import { NextResponse } from "next/server"
import { safeNextPath } from "@/lib/profile-fields"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/env"

/**
 * Google and email confirmation both return here with a one-time code.
 * We trade that code for a login cookie, then send the person onward.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeNextPath(url.searchParams.get("next"))

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(new URL("/sign-in", getSiteUrl()))
  }

  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL("/sign-in?error=auth", getSiteUrl()))
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email" | "magiclink" | "recovery",
    })
    if (error) return NextResponse.redirect(new URL("/sign-in?error=auth", getSiteUrl()))
  } else {
    return NextResponse.redirect(new URL("/sign-in?error=auth", getSiteUrl()))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_completed_at")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.profile_completed_at) {
      return NextResponse.redirect(new URL("/profile/edit", getSiteUrl()))
    }
  }

  return NextResponse.redirect(new URL(next, getSiteUrl()))
}
