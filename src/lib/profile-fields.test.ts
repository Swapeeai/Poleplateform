import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  normalizeAvatar,
  normalizeInstagram,
  parseProfile,
  safeNextPath,
} from "./profile-fields"

describe("normalizeInstagram", () => {
  it("stores a handle without the @ or the site address", () => {
    assert.equal(normalizeInstagram("@Studio.Name").handle, "Studio.Name")
    assert.equal(
      normalizeInstagram("https://www.instagram.com/studio.name/").handle,
      "studio.name",
    )
    assert.equal(normalizeInstagram("").handle, null)
  })

  it("rejects handles with spaces", () => {
    assert.equal(normalizeInstagram("my name").error !== undefined, true)
  })
})

describe("normalizeAvatar", () => {
  it("accepts an https link and rejects other schemes", () => {
    assert.equal(normalizeAvatar("https://example.com/a.png").url, "https://example.com/a.png")
    assert.equal(normalizeAvatar("javascript:alert(1)").error !== undefined, true)
    assert.equal(normalizeAvatar("").url, null)
  })
})

describe("parseProfile", () => {
  it("accepts a finished profile and clears optional blanks", () => {
    const result = parseProfile({
      displayName: "Ava",
      avatarUrl: "",
      country: "France",
      level: "beginner",
      yearsDancing: "0",
      teacherStudio: "",
      instagram: "",
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.value.yearsDancing, 0)
      assert.equal(result.value.teacherStudio, null)
      assert.equal(result.value.instagram, null)
    }
  })

  it("rejects a missing level and a year that is too high", () => {
    const result = parseProfile({
      displayName: "A",
      avatarUrl: "not a link",
      country: "F",
      level: "expert",
      yearsDancing: "81",
      teacherStudio: "",
      instagram: "bad handle",
    })
    assert.equal(result.ok, false)
  })
})

describe("safeNextPath", () => {
  it("keeps local paths and drops off-site redirects", () => {
    assert.equal(safeNextPath("/profile"), "/profile")
    assert.equal(safeNextPath("https://example.com"), "/")
    assert.equal(safeNextPath("//example.com"), "/")
    assert.equal(safeNextPath("/sign-in"), "/")
  })
})
