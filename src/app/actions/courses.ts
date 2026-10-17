"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isAdmin, requireUser } from "@/lib/auth"
import { friendlyDbError } from "@/lib/db-error"
import { ids, isUuid, optionalId, priceToCents, text, wholeNumber, type FormState } from "@/lib/form"
import { CURRENCIES, isOneOf, toSlug } from "@/lib/labels"
import { isLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

/**
 * Part 3: the founder's mini-courses.
 * Payment is not connected yet, so the admin gives access by email.
 */

export async function saveCourse(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can edit courses." }

  const courseId = optionalId(formData, "courseId")
  const title = text(formData, "title")
  const slug = toSlug(text(formData, "slug") || title)
  const level = text(formData, "level")
  const currency = text(formData, "currency")
  const price = priceToCents(text(formData, "price"))

  if (title.length < 3) return { error: "Give the course a title." }
  if (!slug) return { error: "The web address needs letters or numbers." }
  if (!isLevel(level)) return { error: "Choose a level." }
  if (!isOneOf(CURRENCIES, currency)) return { error: "Choose a currency." }
  if (price === null) return { error: "Write the price like 29 or 29.90." }

  const coverId = optionalId(formData, "coverImageId")
  const trailerId = optionalId(formData, "trailerVideoId")
  const fields = {
    title: title.slice(0, 120),
    slug,
    goal: text(formData, "goal").slice(0, 500),
    description: text(formData, "description").slice(0, 6000),
    level,
    price_cents: price,
    currency,
    is_published: formData.get("published") === "yes",
    ...(coverId ? { cover_image_id: coverId } : {}),
    ...(trailerId ? { trailer_video_id: trailerId } : {}),
  }

  const supabase = await createClient()
  const saved = courseId
    ? await supabase.from("courses").update(fields).eq("id", courseId).select("id").single()
    : await supabase.from("courses").insert(fields).select("id").single()
  if (saved.error || !saved.data) return { error: friendlyDbError(saved.error?.message) }
  const id = saved.data.id as string

  const moveIds = ids(formData, "moveIds")
  await supabase.from("course_prerequisites").delete().eq("course_id", id)
  if (moveIds.length) {
    const { error } = await supabase
      .from("course_prerequisites")
      .insert(moveIds.map((moveId) => ({ course_id: id, move_id: moveId })))
    if (error) return { error: friendlyDbError(error.message) }
  }

  revalidatePath("/courses")
  revalidatePath(`/courses/${slug}`)
  revalidatePath("/admin/courses")
  if (!courseId) redirect(`/admin/courses/${id}`)
  return { message: "Saved." }
}

export async function saveLesson(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can edit lessons." }

  const courseId = text(formData, "courseId")
  const lessonId = optionalId(formData, "lessonId")
  const title = text(formData, "title")
  const position = wholeNumber(text(formData, "position"))
  if (!isUuid(courseId)) return { error: "Unknown course." }
  if (title.length < 2) return { error: "Give the lesson a title." }
  if (!position || position > 200) return { error: "The lesson number must be between 1 and 200." }

  const videoId = optionalId(formData, "videoId")
  const fields = {
    course_id: courseId,
    title: title.slice(0, 120),
    position,
    body: text(formData, "body").slice(0, 20000),
    is_free_preview: formData.get("preview") === "yes",
    ...(videoId ? { video_id: videoId } : {}),
  }

  const supabase = await createClient()
  const { error } = lessonId
    ? await supabase.from("lessons").update(fields).eq("id", lessonId)
    : await supabase.from("lessons").insert(fields)
  if (error) {
    if (error.message.includes("duplicate key")) return { error: `There is already a lesson number ${position}.` }
    return { error: friendlyDbError(error.message) }
  }

  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath("/courses", "layout")
  return { message: lessonId ? "Lesson saved." : "Lesson added." }
}

export async function deleteLesson(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can delete lessons." }
  const lessonId = text(formData, "lessonId")
  const courseId = text(formData, "courseId")
  if (!isUuid(lessonId)) return { error: "Unknown lesson." }

  const supabase = await createClient()
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath("/courses", "layout")
  return undefined
}

export async function grantCourse(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can give access." }
  const courseId = text(formData, "courseId")
  const email = text(formData, "email")
  if (!isUuid(courseId)) return { error: "Unknown course." }
  if (!email.includes("@")) return { error: "Write the member's email." }

  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_grant_course", { item_id: courseId, member_email: email })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/admin/courses/${courseId}`)
  return { message: `${email} now has access.` }
}

export async function removeAccess(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  if (!isAdmin(session)) return { error: "Only an admin can remove access." }
  const courseId = text(formData, "courseId")
  const userId = text(formData, "userId")
  if (!isUuid(courseId) || !isUuid(userId)) return { error: "Unknown member." }

  const supabase = await createClient()
  const { error } = await supabase.from("enrollments").delete().eq("course_id", courseId).eq("user_id", userId)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/admin/courses/${courseId}`)
  return undefined
}

/** Tick or untick a lesson as done. */
export async function toggleLessonDone(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const lessonId = text(formData, "lessonId")
  const path = text(formData, "path")
  if (!isUuid(lessonId)) return { error: "Unknown lesson." }

  const supabase = await createClient()
  const { error } =
    formData.get("done") === "yes"
      ? await supabase.from("lesson_progress").upsert(
          { user_id: session.userId, lesson_id: lessonId },
          { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
        )
      : await supabase.from("lesson_progress").delete().eq("user_id", session.userId).eq("lesson_id", lessonId)
  if (error) return { error: friendlyDbError(error.message) }

  if (path.startsWith("/courses/")) revalidatePath(path)
  revalidatePath("/courses", "layout")
  return undefined
}
