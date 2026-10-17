export const LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const
export const ROLES = ["student", "teacher", "admin"] as const

export type DanceLevel = (typeof LEVELS)[number]
export type AppRole = (typeof ROLES)[number]

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  country: string | null
  level: DanceLevel | null
  years_dancing: number | null
  teacher_studio: string | null
  instagram: string | null
  reputation: number
  role: AppRole
  is_verified_teacher: boolean
  profile_completed_at: string | null
  created_at: string
  updated_at: string
}

export type Member = Profile & {
  email: string | null
}

export const levelLabel: Record<DanceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
}

export const roleLabel: Record<AppRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
}

export function isLevel(value: unknown): value is DanceLevel {
  return typeof value === "string" && LEVELS.some((level) => level === value)
}

export function isRole(value: unknown): value is AppRole {
  return typeof value === "string" && ROLES.some((role) => role === value)
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

/** Turn a database row into a profile, or null if the shape is wrong. */
export function toProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== "string" || typeof row.display_name !== "string") return null
  if (!isRole(row.role)) return null
  if (row.level !== null && !isLevel(row.level)) return null
  if (typeof row.reputation !== "number") return null
  if (typeof row.is_verified_teacher !== "boolean") return null

  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: textOrNull(row.avatar_url),
    country: textOrNull(row.country),
    level: isLevel(row.level) ? row.level : null,
    years_dancing: typeof row.years_dancing === "number" ? row.years_dancing : null,
    teacher_studio: textOrNull(row.teacher_studio),
    instagram: textOrNull(row.instagram),
    reputation: row.reputation,
    role: row.role,
    is_verified_teacher: row.is_verified_teacher,
    profile_completed_at: textOrNull(row.profile_completed_at),
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  }
}

export function toMember(value: unknown): Member | null {
  const profile = toProfile(value)
  if (!profile || !value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const email = textOrNull(row.email)
  return { ...profile, email }
}

export function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return letters || "?"
}
