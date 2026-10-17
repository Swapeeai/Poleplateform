import { isLevel, isRole, type AppRole, type DanceLevel } from "./profile"

export type FieldErrors = Partial<
  Record<
    | "displayName"
    | "email"
    | "password"
    | "avatarUrl"
    | "country"
    | "level"
    | "yearsDancing"
    | "teacherStudio"
    | "instagram"
    | "role"
    | "verified",
    string
  >
>

type Ok<T> = { ok: true; value: T }
type Err = { ok: false; fieldErrors: FieldErrors }

export type ProfileInput = {
  displayName: string
  avatarUrl: string | null
  country: string
  level: DanceLevel
  yearsDancing: number
  teacherStudio: string | null
  instagram: string | null
}

export type MemberInput = {
  memberId: string
  role: AppRole
  isVerifiedTeacher: boolean
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function readText(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

/** Only allow a path on this site, so a redirect cannot send someone elsewhere. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/"
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  if (value.startsWith("/sign-in") || value.startsWith("/sign-up") || value.startsWith("/auth")) {
    return "/"
  }
  return value
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function parseSignIn(input: { email: string; password: string }): Ok<{
  email: string
  password: string
}> | Err {
  const fieldErrors: FieldErrors = {}
  if (!isEmail(input.email)) fieldErrors.email = "Enter a valid email address."
  if (input.password.length < 8) fieldErrors.password = "Password must be at least 8 characters."
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  return { ok: true, value: { email: input.email, password: input.password } }
}

export function parseSignUp(input: {
  displayName: string
  email: string
  password: string
}): Ok<{ displayName: string; email: string; password: string }> | Err {
  const fieldErrors: FieldErrors = {}
  if (input.displayName.length < 2 || input.displayName.length > 80) {
    fieldErrors.displayName = "Use 2 to 80 characters."
  }
  if (!isEmail(input.email)) fieldErrors.email = "Enter a valid email address."
  if (input.password.length < 8) fieldErrors.password = "Password must be at least 8 characters."
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  return { ok: true, value: input }
}

/** Accept a pasted handle or a full Instagram link. Store the handle only. */
export function normalizeInstagram(value: string): { handle: string | null; error?: string } {
  let handle = value.trim()
  if (!handle) return { handle: null }
  handle = handle.replace(/^@+/, "")
  handle = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
  handle = handle.split(/[/?#]/)[0] ?? ""
  if (!handle) return { handle: null }
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    return {
      handle: null,
      error: "Use letters, numbers, dots, and underscores only (up to 30).",
    }
  }
  return { handle }
}

export function normalizeAvatar(value: string): { url: string | null; error?: string } {
  const raw = value.trim()
  if (!raw) return { url: null }
  if (raw.length > 2000) return { url: null, error: "That link is too long." }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { url: null, error: "Paste a full link, starting with https://." }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { url: null, error: "The link must start with http:// or https://." }
  }
  return { url: url.toString() }
}

export function parseProfile(input: {
  displayName: string
  avatarUrl: string
  country: string
  level: string
  yearsDancing: string
  teacherStudio: string
  instagram: string
}): Ok<ProfileInput> | Err {
  const fieldErrors: FieldErrors = {}

  if (input.displayName.length < 2 || input.displayName.length > 80) {
    fieldErrors.displayName = "Use 2 to 80 characters."
  }

  const avatar = normalizeAvatar(input.avatarUrl)
  if (avatar.error) fieldErrors.avatarUrl = avatar.error

  if (input.country.length < 2 || input.country.length > 80) {
    fieldErrors.country = "Enter your country (2 to 80 characters)."
  }

  if (!isLevel(input.level)) fieldErrors.level = "Choose a level."

  if (!/^\d{1,2}$/.test(input.yearsDancing)) {
    fieldErrors.yearsDancing = "Enter a whole number from 0 to 80."
  }
  const years = Number(input.yearsDancing)
  if (!fieldErrors.yearsDancing && (years < 0 || years > 80)) {
    fieldErrors.yearsDancing = "Enter a whole number from 0 to 80."
  }

  if (input.teacherStudio.length > 120) {
    fieldErrors.teacherStudio = "Keep the studio name under 120 characters."
  }

  const instagram = normalizeInstagram(input.instagram)
  if (instagram.error) fieldErrors.instagram = instagram.error

  if (Object.keys(fieldErrors).length > 0 || !isLevel(input.level)) {
    return { ok: false, fieldErrors }
  }

  return {
    ok: true,
    value: {
      displayName: input.displayName,
      avatarUrl: avatar.url,
      country: input.country,
      level: input.level,
      yearsDancing: years,
      teacherStudio: input.teacherStudio || null,
      instagram: instagram.handle,
    },
  }
}

export function parseMember(input: {
  memberId: string
  role: string
  verified: boolean
}): Ok<MemberInput> | Err {
  const fieldErrors: FieldErrors = {}
  if (!UUID.test(input.memberId)) fieldErrors.role = "That member was not found."
  if (!isRole(input.role)) fieldErrors.role = "Choose student, teacher, or admin."
  if (input.verified && input.role !== "teacher") {
    fieldErrors.verified = "Only a teacher can be verified. Set the role to teacher first."
  }
  if (Object.keys(fieldErrors).length > 0 || !isRole(input.role)) {
    return { ok: false, fieldErrors }
  }
  return {
    ok: true,
    value: {
      memberId: input.memberId,
      role: input.role,
      isVerifiedTeacher: input.verified && input.role === "teacher",
    },
  }
}
