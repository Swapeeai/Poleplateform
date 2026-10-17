"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"
import { friendlyDbError } from "@/lib/db-error"
import { parseMember, readText } from "@/lib/profile-fields"
import { createClient } from "@/lib/supabase/server"

export type MemberFormState = {
  error?: string
  message?: string
  fieldErrors?: {
    role?: string
    verified?: string
  }
}

export async function updateMember(
  _state: MemberFormState | undefined,
  formData: FormData,
): Promise<MemberFormState> {
  const session = await requireUser()
  if (session.profile?.role !== "admin") return { error: copy.adminDenied }

  const parsed = parseMember({
    memberId: readText(formData, "memberId"),
    role: readText(formData, "role"),
    verified: formData.get("verified") === "yes",
  })
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors }

  if (parsed.value.memberId === session.userId && parsed.value.role !== session.profile.role) {
    return { error: copy.ownRoleBlocked }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role: parsed.value.role,
      is_verified_teacher: parsed.value.isVerifiedTeacher,
    })
    .eq("id", parsed.value.memberId)
    .select("id")
    .maybeSingle()

  if (error) return { error: friendlyDbError(error.message) }
  if (!data) return { error: copy.notAllowed }

  revalidatePath("/admin/members")
  revalidatePath("/")
  revalidatePath("/profile")
  return { message: copy.saved }
}
