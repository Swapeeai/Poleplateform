"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MoveOption } from "@/lib/moves"

type Step = { key: string; moveId: string; note: string }

/**
 * Build an ordered list of moves, for combos and challenges.
 * Sends `moveIds` in order and, when withNotes is on, a matching `notes` list
 * (how to get from this move into the next one).
 */
export function MoveSequence({
  moves,
  withNotes = false,
  label = "Moves, in order",
}: {
  moves: MoveOption[]
  withNotes?: boolean
  label?: string
}) {
  const [steps, setSteps] = useState<Step[]>([])
  const [choice, setChoice] = useState("")
  const nameOf = new Map(moves.map((move) => [move.id, move.name]))

  function move(index: number, by: -1 | 1) {
    setSteps((current) => {
      const next = [...current]
      const target = index + by
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>

      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No moves yet. Add the first one below.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step.key} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-2">
              <input type="hidden" name="moveIds" value={step.moveId} />
              <div className="flex items-center gap-2">
                <span className="w-6 text-sm text-muted-foreground">{index + 1}.</span>
                <span className="flex-1 text-base">{nameOf.get(step.moveId)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => move(index, -1)} aria-label="Move up">
                  ↑
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => move(index, 1)} aria-label="Move down">
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSteps((current) => current.filter((item) => item.key !== step.key))}
                  aria-label="Remove"
                >
                  ✕
                </Button>
              </div>
              {withNotes ? (
                <Input
                  name="notes"
                  value={step.note}
                  maxLength={300}
                  placeholder="Transition into the next move (optional)"
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((item) =>
                        item.key === step.key ? { ...item, note: event.target.value } : item,
                      ),
                    )
                  }
                  className="h-11 text-base"
                />
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <div className="flex gap-2">
        <select
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          aria-label="Choose a move to add"
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-base"
        >
          <option value="">Choose a move…</option>
          {moves.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.aliases.length > 0 ? ` (${option.aliases.join(", ")})` : ""}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={!choice || steps.length >= 30}
          onClick={() => {
            setSteps((current) => [...current, { key: crypto.randomUUID(), moveId: choice, note: "" }])
            setChoice("")
          }}
        >
          Add
        </Button>
      </div>
    </fieldset>
  )
}
