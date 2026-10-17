"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import type { MoveOption } from "@/lib/moves"

function matches(move: MoveOption, search: string): boolean {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return [move.name, ...move.aliases].some((name) => name.toLowerCase().includes(query))
}

/**
 * Tick the moves something is about. Search also finds other names, so
 * "Gemini" finds "Outside leg hang". Sends every ticked id as `name`.
 */
export function MovePicker({
  moves,
  name = "moveIds",
  label = "Which moves?",
  initial = [],
}: {
  moves: MoveOption[]
  name?: string
  label?: string
  initial?: string[]
}) {
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<string[]>(initial)
  const shown = moves.filter((move) => picked.includes(move.id) || matches(move, search)).slice(0, 40)

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search moves, any name"
        className="h-11 text-base"
      />
      <div className="flex max-h-64 flex-col overflow-y-auto">
        {shown.map((move) => (
          <label key={move.id} className="flex min-h-11 items-center gap-3 text-base">
            <input
              type="checkbox"
              name={name}
              value={move.id}
              checked={picked.includes(move.id)}
              onChange={(event) =>
                setPicked((current) =>
                  event.target.checked
                    ? [...current, move.id]
                    : current.filter((id) => id !== move.id),
                )
              }
              className="size-5"
            />
            <span>
              {move.name}
              {move.aliases.length > 0 ? (
                <span className="text-sm text-muted-foreground"> · {move.aliases.join(", ")}</span>
              ) : null}
            </span>
          </label>
        ))}
        {shown.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No move with that name.</p>
        ) : null}
      </div>
    </fieldset>
  )
}
