"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isAdmin, requireUser } from "@/lib/auth"
import { friendlyDbError } from "@/lib/db-error"
import { ids, isUuid, optionalId, text, type FormState } from "@/lib/form"
import { MOVE_CATEGORIES, POLE_TYPES, isOneOf, toSlug } from "@/lib/labels"
import { isLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

/** "Working on it", "Got it", or remove from my list. Private to each member. */
export async function setSavedMove(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const moveId = text(formData, "moveId")
  const status = text(formData, "status")
  const slug = text(formData, "slug")
  if (!isUuid(moveId)) return { error: "Unknown move." }

  const supabase = await createClient()
  const { error } =
    status === "working_on" || status === "got_it"
      ? await supabase.from("saved_moves").upsert(
          { user_id: session.userId, move_id: moveId, status, updated_at: new Date().toISOString() },
          { onConflict: "user_id,move_id" },
        )
      : await supabase.from("saved_moves").delete().eq("user_id", session.userId).eq("move_id", moveId)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/moves/${slug}`)
  revalidatePath("/moves")
  revalidatePath("/")
  return undefined
}

/** One alias per line, without blanks or repeats. */
function aliasList(value: string): string[] {
  const names = value
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name.length <= 80)
  return [...new Set(names)].slice(0, 30)
}

/**
 * Admin: create or edit a move, with its other names, what to learn first,
 * and the strength exercises that help. The database refuses non-admins.
 */
export async function saveMove(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can edit moves." }

  const moveId = optionalId(formData, "moveId")
  const name = text(formData, "name")
  const slug = toSlug(text(formData, "slug") || name)
  const category = text(formData, "category")
  const level = text(formData, "level")
  const poleType = text(formData, "poleType")
  const baseMoveId = optionalId(formData, "baseMoveId")

  if (!name) return { error: "Give the move a name." }
  if (!slug) return { error: "The web address needs letters or numbers." }
  if (!isOneOf(MOVE_CATEGORIES, category)) return { error: "Choose a type of move." }
  if (!isLevel(level)) return { error: "Choose a level." }
  if (!isOneOf(POLE_TYPES, poleType)) return { error: "Choose a pole type." }
  if (moveId && baseMoveId === moveId) return { error: "A move cannot be a variation of itself." }

  const fields = {
    name: name.slice(0, 80),
    slug,
    category,
    level,
    pole_type: poleType,
    description: text(formData, "description").slice(0, 6000),
    common_mistakes: text(formData, "commonMistakes").slice(0, 4000),
    safety_notes: text(formData, "safetyNotes").slice(0, 4000),
    base_move_id: baseMoveId,
  }
  // Only replace the video or picture when a new one was uploaded.
  const demoVideoId = optionalId(formData, "demoVideoId")
  const imageId = optionalId(formData, "imageId")
  const media = {
    ...(demoVideoId ? { demo_video_id: demoVideoId } : {}),
    ...(imageId ? { image_id: imageId } : {}),
  }

  const supabase = await createClient()
  const saved = moveId
    ? await supabase.from("moves").update({ ...fields, ...media }).eq("id", moveId).select("id, slug").single()
    : await supabase.from("moves").insert({ ...fields, ...media }).select("id, slug").single()
  if (saved.error || !saved.data) return { error: friendlyDbError(saved.error?.message) }
  const id = saved.data.id as string

  const aliases = aliasList(text(formData, "aliases"))
  const prerequisites = ids(formData, "prerequisiteIds").filter((item) => item !== id)
  const exercises = ids(formData, "exerciseIds")

  await supabase.from("move_aliases").delete().eq("move_id", id)
  await supabase.from("move_prerequisites").delete().eq("move_id", id)
  await supabase.from("move_conditioning").delete().eq("move_id", id)
  const results = await Promise.all([
    aliases.length ? supabase.from("move_aliases").insert(aliases.map((alias) => ({ move_id: id, alias }))) : null,
    prerequisites.length
      ? supabase
          .from("move_prerequisites")
          .insert(prerequisites.map((prerequisite) => ({ move_id: id, prerequisite_move_id: prerequisite })))
      : null,
    exercises.length
      ? supabase.from("move_conditioning").insert(exercises.map((exercise) => ({ move_id: id, exercise_id: exercise })))
      : null,
  ])
  const failed = results.find((result) => result?.error)
  if (failed?.error) return { error: friendlyDbError(failed.error.message) }

  revalidatePath("/moves")
  revalidatePath(`/moves/${saved.data.slug}`)
  revalidatePath("/admin/moves")
  redirect(`/moves/${saved.data.slug}`)
}

export async function deleteMove(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can delete moves." }
  const moveId = text(formData, "moveId")
  if (!isUuid(moveId)) return { error: "Unknown move." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("moves").delete().eq("id", moveId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath("/moves")
  revalidatePath("/admin/moves")
  redirect("/admin/moves")
}

export async function addExercise(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can add exercises." }
  const name = text(formData, "name")
  if (!name) return { error: "Give the exercise a name." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("conditioning_exercises")
    .insert({ name: name.slice(0, 80), description: text(formData, "description").slice(0, 2000) })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath("/admin/moves")
  return { message: "Exercise added. It now shows in every move form." }
}
