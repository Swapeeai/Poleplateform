/** What a form action sends back to the form: an error, or a short success note. */
export type FormState = { error?: string; message?: string } | undefined

export function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export function optionalId(formData: FormData, name: string): string | null {
  const value = text(formData, name)
  return isUuid(value) ? value : null
}

/** Every value of a repeated field, such as ticked moves, without blanks or repeats. */
export function ids(formData: FormData, name: string): string[] {
  const values = formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && isUuid(value))
  return [...new Set(values)]
}

export function wholeNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

/** "12.50" becomes 1250 cents. Returns null when it is not a price. */
export function priceToCents(value: string): number | null {
  if (value === "") return 0
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null
  return Math.round(Number(value) * 100)
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
