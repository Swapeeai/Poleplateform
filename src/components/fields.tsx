import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"

/**
 * Plain form fields with a label and an optional hint, sized for thumbs.
 * Each label wraps its own field, so the same form can appear several
 * times on one page (e.g. one per lesson) without mixing up fields.
 */

const boxClass = "w-full rounded-lg border border-input bg-transparent px-2.5 text-base"

export function TextField({
  name,
  label,
  hint,
  defaultValue,
  required,
  type = "text",
  maxLength,
  placeholder,
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: string | number | null
  required?: boolean
  type?: "text" | "email" | "number" | "datetime-local" | "date"
  maxLength?: number
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {label}
        <Input
          name={name}
          type={type}
          defaultValue={defaultValue ?? undefined}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          step={type === "number" ? "any" : undefined}
          className="h-11 text-base font-normal"
        />
      </label>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function TextArea({
  name,
  label,
  hint,
  defaultValue,
  required,
  maxLength,
  rows = 4,
  placeholder,
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: string | null
  required?: boolean
  maxLength?: number
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {label}
        <textarea
          name={name}
          defaultValue={defaultValue ?? undefined}
          required={required}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className={`${boxClass} py-2 font-normal`}
        />
      </label>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
  required,
  blank,
}: {
  name: string
  label: string
  options: readonly { value: string; label: string }[]
  defaultValue?: string | null
  required?: boolean
  blank?: string
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className={`${boxClass} h-11 font-normal`}
      >
        {blank !== undefined ? <option value="">{blank}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CheckField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string
  label: string
  hint?: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-start gap-3 text-base">
      <input
        type="checkbox"
        name={name}
        value="yes"
        defaultChecked={defaultChecked}
        className="mt-1 size-5"
      />
      <span>
        {label}
        {hint ? <span className="block text-sm text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  )
}

export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string
  lead?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {lead ? <p className="text-base text-muted-foreground">{lead}</p> : null}
      {children}
    </div>
  )
}

/** Turns a label map into select options, e.g. levelLabel. */
export function toOptions<T extends string>(labels: Record<T, string>, order: readonly T[]) {
  return order.map((value) => ({ value, label: labels[value] }))
}
