"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PLAN_SECTIONS, sectionLabel, type PlanSection } from "@/lib/labels"

type Option = { id: string; name: string }
type Kind = "move" | "exercise" | "combo" | "note"
type Item = { key: string; section: PlanSection; kind: Kind; refId: string; note: string }

const boxClass = "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"

/**
 * Build a class plan, section by section. Each line is a move, a strength
 * exercise, a combo, or just a note. Sends everything as one `items` field.
 */
export function PlanBuilder({
  moves,
  exercises,
  combos,
}: {
  moves: Option[]
  exercises: Option[]
  combos: Option[]
}) {
  const [items, setItems] = useState<Item[]>([])
  const [section, setSection] = useState<PlanSection>("warm_up")
  const [kind, setKind] = useState<Kind>("note")
  const [refId, setRefId] = useState("")
  const [note, setNote] = useState("")

  const lists: Record<Exclude<Kind, "note">, Option[]> = { move: moves, exercise: exercises, combo: combos }
  const nameOf = (item: Item) =>
    item.kind === "note" ? "" : lists[item.kind].find((option) => option.id === item.refId)?.name ?? ""
  const canAdd = kind === "note" ? note.trim().length > 0 : refId !== ""
  const ordered = PLAN_SECTIONS.flatMap((name) => items.filter((item) => item.section === name))

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">The plan</legend>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(ordered.map(({ section, kind, refId, note }) => ({ section, kind, refId, note })))}
      />

      {PLAN_SECTIONS.map((name) => {
        const inSection = items.filter((item) => item.section === name)
        if (inSection.length === 0) return null
        return (
          <div key={name} className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{sectionLabel[name]}</p>
            <ul className="flex flex-col gap-1">
              {inSection.map((item) => (
                <li key={item.key} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1">
                  <span className="flex-1 text-base">
                    {nameOf(item)}
                    {item.note ? (
                      <span className="text-muted-foreground">
                        {nameOf(item) ? " — " : ""}
                        {item.note}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove"
                    onClick={() => setItems((current) => current.filter((other) => other.key !== item.key))}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Empty. Add lines below, starting with the warm-up.</p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Section"
            value={section}
            onChange={(event) => setSection(event.target.value as PlanSection)}
            className={boxClass}
          >
            {PLAN_SECTIONS.map((name) => (
              <option key={name} value={name}>
                {sectionLabel[name]}
              </option>
            ))}
          </select>
          <select
            aria-label="What"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as Kind)
              setRefId("")
            }}
            className={boxClass}
          >
            <option value="note">A note</option>
            <option value="move">A move</option>
            <option value="exercise">An exercise</option>
            <option value="combo">A combo</option>
          </select>
        </div>
        {kind !== "note" ? (
          <select
            aria-label="Choose"
            value={refId}
            onChange={(event) => setRefId(event.target.value)}
            className={boxClass}
          >
            <option value="">Choose…</option>
            {lists[kind].map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        ) : null}
        <Input
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder={kind === "note" ? "e.g. 5 min wrist and shoulder circles" : "Note, e.g. 3 × 8 each side (optional)"}
          className="h-11 text-base"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base"
          disabled={!canAdd || items.length >= 60}
          onClick={() => {
            setItems((current) => [...current, { key: crypto.randomUUID(), section, kind, refId, note: note.trim() }])
            setRefId("")
            setNote("")
          }}
        >
          Add line
        </Button>
      </div>
    </fieldset>
  )
}
