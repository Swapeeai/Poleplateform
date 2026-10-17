import assert from "node:assert/strict"
import { test } from "node:test"
import { friendlyDbError } from "./db-error"
import { ids, priceToCents, wholeNumber } from "./form"
import { formatPrice, toSlug } from "./labels"

test("toSlug makes a clean web address", () => {
  assert.equal(toSlug("Pole Sit!"), "pole-sit")
  assert.equal(toSlug("  Ayesha (elbow grip) "), "ayesha-elbow-grip")
  assert.equal(toSlug("Écarté"), "ecarte")
  assert.equal(toSlug("!!!"), "")
})

test("priceToCents reads prices people type", () => {
  assert.equal(priceToCents(""), 0)
  assert.equal(priceToCents("29"), 2900)
  assert.equal(priceToCents("29.9"), 2990)
  assert.equal(priceToCents("29.95"), 2995)
  assert.equal(priceToCents("29,95"), null)
  assert.equal(priceToCents("-5"), null)
})

test("formatPrice shows Free for zero", () => {
  assert.equal(formatPrice(0, "EUR"), "Free")
  assert.match(formatPrice(2900, "EUR"), /29/)
})

test("wholeNumber refuses anything but digits", () => {
  assert.equal(wholeNumber("3"), 3)
  assert.equal(wholeNumber("3.5"), null)
  assert.equal(wholeNumber("-1"), null)
})

test("ids keeps only real ids, once each", () => {
  const form = new FormData()
  const id = "6f1c1e8e-3c1a-4b8a-9a43-0b4a8f1d2c3e"
  form.append("moveIds", id)
  form.append("moveIds", id)
  form.append("moveIds", "not-an-id")
  assert.deepEqual(ids(form, "moveIds"), [id])
})

test("friendlyDbError passes on the database's own sentences", () => {
  assert.equal(friendlyDbError("Video is longer than 90 seconds"), "Video is longer than 90 seconds")
  assert.equal(friendlyDbError("You cannot vote on your own post"), "You cannot vote on your own post")
  assert.equal(
    friendlyDbError('duplicate key value violates unique constraint "challenge_entries_challenge_id_user_id_key"'),
    "You already entered this challenge.",
  )
  assert.equal(
    friendlyDbError("new row violates row-level security policy for table \"moves\""),
    "You are not allowed to do that.",
  )
})
