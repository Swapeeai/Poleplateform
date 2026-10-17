"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"
import { friendlyDbError } from "@/lib/db-error"
import { parseProfile, readText } from "@/lib/profile-fields"
import { createClient } from "@/lib/supabase/server"

export type ProfileFormState = {
  error?: string
  fieldErrors?: {
    displayName?: string
    avatarUrl?: string
    country?: string
    level?: string
    yearsDancing?: string
    teacherStudio?: string
    instagram?: string
  }
}

export async function updateProfile(
  _state: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireUser()
  const parsed = parseProfile({
    displayName: readText(formData, "displayName"),
    avatarUrl: readText(formData, "avatarUrl"),
    country: readText(formData, "country"),
    level: readText(formData, "level"),
    yearsDancing: readText(formData, "yearsDancing"),
    teacherStudio: readText(formData, "teacherStudio"),
    instagram: readText(formData, "instagram"),
  })
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.value.displayName,
      avatar_url: parsed.value.avatarUrl,
      country: parsed.value.country,
      level: parsed.value.level,
      years_dancing: parsed.value.yearsDancing,
      teacher_studio: parsed.value.teacherStudio,
      instagram: parsed.value.instagram,
      profile_completed_at: session.profile?.profile_completed_at ?? new Date().toISOString(),
    })
    .eq("id", session.userId)
    .select("id")
    .maybeSingle()

  if (error) return { error: friendlyDbError(error.message) }
  if (!data) return { error: copy.notAllowed }

  revalidatePath("/")
  revalidatePath("/profile")
  revalidatePath("/profile/edit")
  redirect("/profile")
}
