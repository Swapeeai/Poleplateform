"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isTeacher, requireUser } from "@/lib/auth"
import { friendlyDbError } from "@/lib/db-error"
import { ids, isUuid, optionalId, text, type FormState } from "@/lib/form"
import { isLevel } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

/** Part 1: Ask the Pole. Post a clip, get fixes, mark what helped. */

export async function askQuestion(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const title = text(formData, "title")
  const level = text(formData, "level")
  const videoId = optionalId(formData, "videoId")
  const moveIds = ids(formData, "moveIds")

  if (title.length < 5) return { error: "Write a short title, at least 5 letters." }
  if (!isLevel(level)) return { error: "Choose your level." }
  if (!videoId) return { error: "Add your video and wait until it says Uploaded." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("questions")
    .insert({
      author_id: session.userId,
      title: title.slice(0, 140),
      body: text(formData, "body").slice(0, 4000),
      tried: text(formData, "tried").slice(0, 2000),
      level,
      video_id: videoId,
    })
    .select("id")
    .single()
  if (error || !data) return { error: friendlyDbError(error?.message) }

  if (moveIds.length > 0) {
    await supabase
      .from("content_tags")
      .insert(moveIds.map((moveId) => ({ target_type: "question", target_id: data.id, move_id: moveId })))
  }

  revalidatePath("/ask")
  redirect(`/ask/${data.id}`)
}

export async function answerQuestion(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const questionId = text(formData, "questionId")
  const body = text(formData, "body")
  if (!isUuid(questionId)) return { error: "Unknown question." }
  if (body.length < 1) return { error: "Write your advice first." }

  const teacher = isTeacher(session)
  const supabase = await createClient()
  const { error } = await supabase.from("answers").insert({
    question_id: questionId,
    author_id: session.userId,
    body: body.slice(0, 4000),
    video_id: optionalId(formData, "videoId"),
    is_technique: teacher && formData.get("technique") === "yes",
    is_conditioning: teacher && formData.get("conditioning") === "yes",
  })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/ask/${questionId}`)
  return { message: "Thanks! Your answer is posted." }
}

export async function addComment(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser()
  const answerId = text(formData, "answerId")
  const questionId = text(formData, "questionId")
  const body = text(formData, "body")
  if (!isUuid(answerId)) return { error: "Unknown answer." }
  if (body.length < 1) return { error: "Write something first." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("comments")
    .insert({ answer_id: answerId, author_id: session.userId, body: body.slice(0, 1000) })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/ask/${questionId}`)
  return { message: "Posted." }
}

/** The asker marks the answer that fixed it. Choosing it again un-marks it. */
export async function markHelpful(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const questionId = text(formData, "questionId")
  const answerId = text(formData, "answerId")
  if (!isUuid(questionId) || !isUuid(answerId)) return { error: "Unknown answer." }

  const supabase = await createClient()
  const { data: question } = await supabase
    .from("questions")
    .select("accepted_answer_id")
    .eq("id", questionId)
    .maybeSingle()

  const { error } = await supabase
    .from("questions")
    .update({ accepted_answer_id: question?.accepted_answer_id === answerId ? null : answerId })
    .eq("id", questionId)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/ask/${questionId}`)
  revalidatePath("/ask")
  return undefined
}

export async function addSuccessVideo(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const questionId = text(formData, "questionId")
  const videoId = optionalId(formData, "videoId")
  if (!isUuid(questionId)) return { error: "Unknown question." }
  if (!videoId) return { error: "Add your video and wait until it says Uploaded." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("questions")
    .update({ success_video_id: videoId })
    .eq("id", questionId)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath(`/ask/${questionId}`)
  return { message: "Well done! Your success video is up." }
}

export async function deleteQuestion(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const questionId = text(formData, "questionId")
  if (!isUuid(questionId)) return { error: "Unknown question." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("questions").delete().eq("id", questionId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath("/ask")
  redirect("/ask")
}

export async function deleteAnswer(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const answerId = text(formData, "answerId")
  const questionId = text(formData, "questionId")
  if (!isUuid(answerId)) return { error: "Unknown answer." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("answers").delete().eq("id", answerId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath(`/ask/${questionId}`)
  return undefined
}

export async function deleteComment(_state: FormState, formData: FormData): Promise<FormState> {
  await requireUser()
  const commentId = text(formData, "commentId")
  const questionId = text(formData, "questionId")
  if (!isUuid(commentId)) return { error: "Unknown comment." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id")
  if (error || !data?.length) return { error: friendlyDbError(error?.message) }

  revalidatePath(`/ask/${questionId}`)
  return undefined
}
