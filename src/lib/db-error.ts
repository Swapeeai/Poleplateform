/** Turn a database refusal into a sentence a person can read. */
export function friendlyDbError(message: string | undefined): string {
  if (!message) return "That change was not saved. You are not allowed to do it."
  if (message.includes("Only an admin can change roles")) return "Only an admin can change roles."
  if (message.includes("Only an admin can verify")) return "Only an admin can verify a teacher."
  if (message.includes("Only a teacher can be verified")) {
    return "Only a teacher can be verified. Set the role to teacher first."
  }
  if (message.includes("Reputation cannot be edited")) return "Reputation cannot be edited."
  return "That change was not saved. You are not allowed to do it."
}
