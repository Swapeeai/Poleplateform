"use server"

import { revalidatePath } from "next/cache"
import { requireUser, isAdmin } from "@/lib/auth"
import { friendlyDbError } from "@/lib/db-error"
import { isUuid, text, type FormState } from "@/lib/form"
import { isOneOf } from "@/lib/labels"
import { createClient } from "@/lib/supabase/server"

const VOTE_TARGETS = ["question", "answer", "challenge_entry"] as const
const REPORT_TARGETS = ["question", "answer", "comment", "combo", "challenge_entry", "media"] as const
const REPORT_STATUSES = ["resolved", "dismissed"] as const

/** The page to refresh after a change. Only paths inside this app. */
function backTo(formData: FormData): string {
  const path = text(formData, "path")
  return path.startsWith("/") && !path.startsWith("//") ? path : "/"
}

/**
 * Up or down vote. Pressing the same arrow again takes the vote back.
 * Scores and reputation points are updated by the database, not here.
 */
export async function castVote(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const targetType = text(formData, "targetType")
  const targetId = text(formData, "targetId")
  const value = text(formData, "value") === "-1" ? -1 : 1
  if (!isOneOf(VOTE_TARGETS, targetType) || !isUuid(targetId)) return { error: "Nothing to vote on." }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", session.userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle()

  const { error } =
    existing?.value === value
      ? await supabase
          .from("votes")
          .delete()
          .eq("user_id", session.userId)
          .eq("target_type", targetType)
          .eq("target_id", targetId)
      : await supabase
          .from("votes")
          .upsert(
            { user_id: session.userId, target_type: targetType, target_id: targetId, value },
            { onConflict: "user_id,target_type,target_id" },
          )

  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath(backTo(formData))
  return undefined
}

export async function createReport(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const targetType = text(formData, "targetType")
  const targetId = text(formData, "targetId")
  const reason = text(formData, "reason")
  if (!isOneOf(REPORT_TARGETS, targetType) || !isUuid(targetId)) return { error: "Nothing to report." }
  if (reason.length < 3) return { error: "Say in a few words what is wrong." }

  const supabase = await createClient()
  const { error } = await supabase.from("reports").insert({
    reporter_id: session.userId,
    target_type: targetType,
    target_id: targetId,
    reason: reason.slice(0, 500),
  })
  if (error) return { error: friendlyDbError(error.message) }
  return { message: "Thank you. An admin will look at it." }
}

export async function closeReport(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can do this." }
  const reportId = text(formData, "reportId")
  const status = text(formData, "status")
  if (!isUuid(reportId) || !isOneOf(REPORT_STATUSES, status)) return { error: "Unknown report." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_by: session.userId, resolved_at: new Date().toISOString() })
    .eq("id", reportId)
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/admin/reports")
  revalidatePath("/admin")
  return { message: status === "resolved" ? "Marked as handled." : "Dismissed." }
}
