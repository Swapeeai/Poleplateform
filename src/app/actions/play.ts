"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isAdmin, isTeacher, requireUser } from "@/lib/auth"
import { friendlyDbError } from "@/lib/db-error"
import { isUuid, optionalId, text, type FormState } from "@/lib/form"
import { PLAN_SECTIONS, isOneOf } from "@/lib/labels"
import { isLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

/** Part 2: playing with moves. Combos, weekly challenges, class plans. */

/** Ordered move ids from a MoveSequence, keeping repeats (a combo can use a move twice). */
function orderedMoves(formData: FormData): string[] {
  return formData
    .getAll("moveIds")
    .filter((value): value is string => typeof value === "string" && isUuid(value))
    .slice(0, 30)
}

export async function createCombo(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const title = text(formData, "title")
  const moveIds = orderedMoves(formData)
  const notes = formData.getAll("notes").map((value) => (typeof value === "string" ? value.trim() : ""))

  if (title.length < 2) return { error: "Give your combo a name." }
  if (moveIds.length < 2) return { error: "A combo needs at least two moves." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("combos")
    .insert({
      author_id: session.userId,
      title: title.slice(0, 120),
      notes: text(formData, "comboNotes").slice(0, 2000),
      video_id: optionalId(formData, "videoId"),
    })
    .select("id")
    .single()
  if (error || !data) return { error: friendlyDbError(error?.message) }

  const { error: movesError } = await supabase.from("combo_moves").insert(
    moveIds.map((moveId, index) => ({
      combo_id: data.id,
      position: index + 1,
      move_id: moveId,
      transition_note: (notes[index] ?? "").slice(0, 300),
    })),
  )
  if (movesError) {
    await supabase.from("combos").delete().eq("id", data.id)
    return { error: friendlyDbError(movesError.message) }
  }

  revalidatePath("/play")
  redirect(`/play/combos/${data.id}`)
}

export async function deleteCombo(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const comboId = text(formData, "comboId")
  if (!isUuid(comboId)) return { error: "Unknown combo." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("combos").delete().eq("id", comboId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath("/play")
  redirect("/play")
}

/** Admin: a weekly challenge. Dates come from the admin's own time zone (the browser sends it). */
export async function createChallenge(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can create challenges." }

  const title = text(formData, "title")
  const level = text(formData, "level")
  const startsAt = toInstant(text(formData, "startsAt"), text(formData, "timezoneOffset"))
  const endsAt = toInstant(text(formData, "endsAt"), text(formData, "timezoneOffset"))
  const moveIds = orderedMoves(formData)

  if (title.length < 3) return { error: "Give the challenge a name." }
  if (!isLevel(level)) return { error: "Choose a level." }
  if (!startsAt || !endsAt) return { error: "Pick a start and an end date." }
  if (endsAt <= startsAt) return { error: "The end must be after the start." }
  if (moveIds.length === 0) return { error: "Add at least one move." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      title: title.slice(0, 120),
      rules: text(formData, "rules").slice(0, 4000),
      level,
      starts_at: startsAt,
      ends_at: endsAt,
      is_ordered: formData.get("ordered") === "yes",
      created_by: session.userId,
    })
    .select("id")
    .single()
  if (error || !data) return { error: friendlyDbError(error?.message) }

  const { error: movesError } = await supabase
    .from("challenge_moves")
    .insert(moveIds.map((moveId, index) => ({ challenge_id: data.id, position: index + 1, move_id: moveId })))
  if (movesError) {
    await supabase.from("challenges").delete().eq("id", data.id)
    return { error: friendlyDbError(movesError.message) }
  }

  revalidatePath("/play")
  redirect(`/play/challenges/${data.id}`)
}

/** "2026-10-20T09:00" typed in a browser that is `offset` minutes behind UTC. */
function toInstant(local: string, offset: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null
  const minutes = Number(offset)
  const utc = new Date(`${local}:00Z`).getTime() + (Number.isFinite(minutes) ? minutes : 0) * 60_000
  return Number.isNaN(utc) ? null : new Date(utc).toISOString()
}

export async function enterChallenge(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const challengeId = text(formData, "challengeId")
  const videoId = optionalId(formData, "videoId")
  if (!isUuid(challengeId)) return { error: "Unknown challenge." }
  if (!videoId) return { error: "Add your video and wait until it says Uploaded." }

  const supabase = await createClient()
  const { error } = await supabase.from("challenge_entries").insert({
    challenge_id: challengeId,
    user_id: session.userId,
    video_id: videoId,
    note: text(formData, "note").slice(0, 500),
  })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/play/challenges/${challengeId}`)
  return { message: "You're in! Good luck." }
}

export async function featureEntry(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can feature entries." }
  const entryId = text(formData, "entryId")
  const challengeId = text(formData, "challengeId")
  if (!isUuid(entryId)) return { error: "Unknown entry." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("challenge_entries")
    .update({ is_featured: formData.get("featured") === "yes" })
    .eq("id", entryId)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/play/challenges/${challengeId}`)
  return undefined
}

export async function deleteEntry(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const entryId = text(formData, "entryId")
  const challengeId = text(formData, "challengeId")
  if (!isUuid(entryId)) return { error: "Unknown entry." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("challenge_entries").delete().eq("id", entryId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath(`/play/challenges/${challengeId}`)
  return undefined
}

type PlanItem = { section: string; kind: string; refId: string; note: string }

function planItems(raw: string): PlanItem[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is PlanItem => Boolean(item) && typeof item === "object")
      .map((item) => ({
        section: String(item.section ?? ""),
        kind: String(item.kind ?? ""),
        refId: String(item.refId ?? ""),
        note: String(item.note ?? "").trim().slice(0, 300),
      }))
      .filter((item) => isOneOf(PLAN_SECTIONS, item.section))
      .filter((item) => (item.kind === "note" ? item.note.length > 0 : isUuid(item.refId)))
      .slice(0, 60)
  } catch {
    return []
  }
}

/** Teachers: a class plan. Only an admin can make it a suggested plan for every teacher. */
export async function createPlan(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isTeacher(session)) return { error: "Class plans are for teachers." }

  const title = text(formData, "title")
  const items = planItems(text(formData, "items"))
  const weekOf = text(formData, "weekOf")
  if (title.length < 2) return { error: "Give the plan a name." }
  if (items.length === 0) return { error: "Add at least one item to the plan." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("class_plans")
    .insert({
      author_id: session.userId,
      title: title.slice(0, 120),
      notes: text(formData, "notes").slice(0, 4000),
      is_suggested: isAdmin(session) && formData.get("suggested") === "yes",
      week_of: /^\d{4}-\d{2}-\d{2}$/.test(weekOf) ? weekOf : null,
    })
    .select("id")
    .single()
  if (error || !data) return { error: friendlyDbError(error?.message) }

  const { error: itemsError } = await supabase.from("class_plan_items").insert(
    items.map((item, index) => ({
      plan_id: data.id,
      position: index + 1,
      section: item.section,
      move_id: item.kind === "move" ? item.refId : null,
      exercise_id: item.kind === "exercise" ? item.refId : null,
      combo_id: item.kind === "combo" ? item.refId : null,
      note: item.note,
    })),
  )
  if (itemsError) {
    await supabase.from("class_plans").delete().eq("id", data.id)
    return { error: friendlyDbError(itemsError.message) }
  }

  revalidatePath("/play/plans")
  redirect(`/play/plans/${data.id}`)
}

export async function deletePlan(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const planId = text(formData, "planId")
  if (!isUuid(planId)) return { error: "Unknown plan." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("class_plans").delete().eq("id", planId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath("/play/plans")
  redirect("/play/plans")
}
