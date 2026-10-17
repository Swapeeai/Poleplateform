"use server"

import { redirect } from "next/navigation"
import { copy } from "@/lib/copy"
import { parseSignIn, parseSignUp, readText, safeNextPath } from "@/lib/profile-fields"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/env"

export type AuthFormState = {
  error?: string
  message?: string
  fieldErrors?: {
    displayName?: string
    email?: string
    password?: string
  }
}

function isUnreachable(message: string): boolean {
  const text = message.toLowerCase()
  return text.includes("fetch") || text.includes("network") || text.includes("failed to reach")
}

function authErrorMessage(message: string): string {
  if (isUnreachable(message)) return copy.supabaseUnreachable
  return copy.badCredentials
}

export async function signIn(
  _state: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  if (!hasSupabaseEnv()) return { error: copy.setupBody }

  const parsed = parseSignIn({
    email: readText(formData, "email").toLowerCase(),
    password: readText(formData, "password"),
  })
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.value)
  if (error) return { error: authErrorMessage(error.message) }

  redirect(safeNextPath(readText(formData, "next")))
}

export async function signUp(
  _state: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  if (!hasSupabaseEnv()) return { error: copy.setupBody }

  const parsed = parseSignUp({
    displayName: readText(formData, "displayName"),
    email: readText(formData, "email").toLowerCase(),
    password: readText(formData, "password"),
  })
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: { display_name: parsed.value.displayName },
    },
  })

  if (error) {
    if (/already registered/i.test(error.message)) return { error: copy.emailTaken }
    if (isUnreachable(error.message)) return { error: copy.supabaseUnreachable }
    return { error: "The account was not created. Check the email and password, then try again." }
  }

  // When email confirmation is on, Supabase creates the user but no session yet.
  if (!data.session) return { message: copy.checkEmail }

  redirect("/profile/edit")
}

export async function signInWithGoogle(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/sign-in")

  const next = safeNextPath(readText(formData, "next"))
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) redirect("/sign-in?error=google")
  redirect(data.url)
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect("/sign-in")
}
