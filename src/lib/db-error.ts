/**
 * Sentences the database itself raises (see supabase/migrations). They are
 * already written for people, so they are shown as they are.
 */
const READABLE = [
  "Only an admin can change roles",
  "Only an admin can verify",
  "Only a teacher can be verified",
  "Reputation cannot be edited",
  "Video not found",
  "You can only post your own video",
  "That file is not a video",
  "Video is longer than",
  "Only the person who asked can mark the answer that helped",
  "Only the person who asked can add a success video",
  "That answer belongs to another question",
  "Only teachers can label an answer as technique or conditioning",
  "You cannot vote on your own post",
  "Nothing to vote on",
  "This challenge is not open",
  "Only an admin can feature an entry",
  "Only an admin can give course access",
  "No member has that email",
]

/** Turn a database refusal into a sentence a person can read. */
export function friendlyDbError(message: string | undefined): string {
  if (!message) return "That change was not saved. You are not allowed to do it."
  const known = READABLE.find((sentence) => message.includes(sentence))
  if (known) return message.split("\n")[0]
  if (message.includes("duplicate key")) {
    if (message.includes("challenge_entries")) return "You already entered this challenge."
    if (message.includes("reports")) return "You already reported this."
    if (message.includes("slug")) return "That web address is taken. Change the name or the address."
    return "That already exists."
  }
  if (message.includes("violates check constraint")) {
    return "Something in the form is too long, too short, or not allowed. Check the fields and try again."
  }
  if (message.includes("row-level security")) return "You are not allowed to do that."
  return "That change was not saved. You are not allowed to do it."
}
