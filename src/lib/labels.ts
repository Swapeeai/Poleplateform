/**
 * Fixed lists the database also checks, with the words people see.
 * If you add a value here, add it to the matching check in supabase/migrations.
 */
export const MOVE_CATEGORIES = [
  "spin",
  "climb",
  "hold",
  "invert",
  "transition",
  "floorwork",
  "flexibility",
  "other",
] as const
export type MoveCategory = (typeof MOVE_CATEGORIES)[number]

export const categoryLabel: Record<MoveCategory, string> = {
  spin: "Spin",
  climb: "Climb",
  hold: "Hold",
  invert: "Invert",
  transition: "Transition",
  floorwork: "Floorwork",
  flexibility: "Flexibility",
  other: "Other",
}

export const POLE_TYPES = ["both", "static", "spin"] as const
export type PoleType = (typeof POLE_TYPES)[number]

export const poleTypeLabel: Record<PoleType, string> = {
  both: "Static or spin pole",
  static: "Static pole",
  spin: "Spin pole",
}

export const VISIBILITIES = ["members", "teachers", "course"] as const
export type Visibility = (typeof VISIBILITIES)[number]

export const visibilityLabel: Record<Visibility, string> = {
  members: "All members",
  teachers: "Teachers only",
  course: "Course buyers only",
}

export const PLAN_SECTIONS = ["warm_up", "conditioning", "moves", "combo", "cool_down"] as const
export type PlanSection = (typeof PLAN_SECTIONS)[number]

export const sectionLabel: Record<PlanSection, string> = {
  warm_up: "Warm-up",
  conditioning: "Conditioning",
  moves: "Moves",
  combo: "Combo",
  cool_down: "Cool-down",
}

export const CURRENCIES = ["EUR", "USD", "THB"] as const
export type Currency = (typeof CURRENCIES)[number]

/** Video length limits, in seconds. The database checks the same numbers. */
export const CLIP_LIMITS = {
  question: 90,
  combo: 180,
  challenge: 180,
} as const

/** 200 MB. The Supabase free plan stops at 50 MB per file. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && list.some((item) => item === value)
}

export function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Free"
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(cents / 100)
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  )
}

/** Whether a challenge is taking entries. The database checks the same thing on entry. */
export function challengeStatus(startsAt: string, endsAt: string): "upcoming" | "open" | "finished" {
  const now = Date.now()
  if (now < new Date(startsAt).getTime()) return "upcoming"
  if (now > new Date(endsAt).getTime()) return "finished"
  return "open"
}

/** "pole-sit" from "Pole Sit!" Used for move and course web addresses. */
export function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}
