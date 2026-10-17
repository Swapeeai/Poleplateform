import "server-only"

import { createClient } from "@/lib/supabase/server"

export type MoveOption = { id: string; name: string; slug: string; aliases: string[] }

/** Every move with its other names, for the move pickers in forms. */
export async function getMoveOptions(): Promise<MoveOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("moves")
    .select("id, name, slug, move_aliases(alias)")
    .order("name")

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    aliases: ((row.move_aliases ?? []) as { alias: string }[]).map((item) => item.alias),
  }))
}

export type MoveLink = { id: string; name: string; slug: string }

/** Names and addresses for a list of move ids, in the same order. */
export async function getMovesByIds(moveIds: string[]): Promise<MoveLink[]> {
  if (moveIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase.from("moves").select("id, name, slug").in("id", moveIds)
  const byId = new Map((data ?? []).map((row) => [row.id as string, row as MoveLink]))
  return moveIds.map((id) => byId.get(id)).filter((move): move is MoveLink => Boolean(move))
}

/** Moves tagged on a question, combo, challenge or course. */
export async function getTaggedMoves(
  targetType: "question" | "combo" | "challenge" | "course",
  targetId: string,
): Promise<MoveLink[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("content_tags")
    .select("move_id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
  return getMovesByIds((data ?? []).map((row) => row.move_id as string))
}
