import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { toProfile, type Profile } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"
import { hasSupabaseEnv } from "@/lib/supabase/env"

export type CurrentSession = {
  userId: string
  email: string | null
  profile: Profile | null
}

/**
 * Who is signed in, and what is their profile?
 * React cache() only avoids asking twice during the same page load.
 * It does not keep a role around after an admin changes it.
 */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  if (!hasSupabaseEnv()) return null

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const { data: row } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, country, level, years_dancing, teacher_studio, instagram, reputation, role, is_verified_teacher, profile_completed_at, created_at, updated_at",
    )
    .eq("id", data.user.id)
    .maybeSingle()

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    profile: toProfile(row),
  }
})

export async function requireUser(): Promise<CurrentSession> {
  const session = await getCurrentSession()
  if (!session) redirect("/sign-in")
  return session
}

/**
 * True when the person is an admin. Pages use it to hide admin screens.
 * The real protection is in the database rules, which check again.
 */
export function isAdmin(session: CurrentSession): boolean {
  return session.profile?.role === "admin"
}

export function isTeacher(session: CurrentSession): boolean {
  return session.profile?.role === "teacher" || session.profile?.role === "admin"
}
