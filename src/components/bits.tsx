import type { ReactNode } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/labels"
import type { MoveLink } from "@/lib/moves"

export type Author = {
  display_name: string
  role: string
  is_verified_teacher: boolean
  reputation: number
} | null

/** "Anna · Verified teacher · 120 pts · 3 Oct 2026" */
export function AuthorLine({ author, date }: { author: Author; date: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{author?.display_name ?? "Former member"}</span>
      {author?.role === "teacher" && author.is_verified_teacher ? (
        <Badge variant="outline">Verified teacher</Badge>
      ) : author?.role === "teacher" ? (
        <Badge variant="secondary">Teacher</Badge>
      ) : author?.role === "admin" ? (
        <Badge>Founder</Badge>
      ) : null}
      {author ? <span>{author.reputation} pts</span> : null}
      <span>{formatDate(date)}</span>
    </p>
  )
}

export function MoveChips({ moves }: { moves: MoveLink[] }) {
  if (moves.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {moves.map((move) => (
        <li key={move.id}>
          <Link
            href={`/moves/${move.slug}`}
            className="inline-flex h-9 items-center rounded-full border px-3 text-sm"
          >
            {move.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed p-4 text-base text-muted-foreground">{children}</p>
}

/** A tappable row in a list: title, a line under it, and an optional right-hand note. */
export function ListLink({
  href,
  title,
  sub,
  side,
}: {
  href: string
  title: string
  sub?: ReactNode
  side?: ReactNode
}) {
  return (
    <Link href={href} className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium">{title}</span>
        {sub ? <span className="text-sm text-muted-foreground">{sub}</span> : null}
      </span>
      {side ? <span className="shrink-0 text-sm text-muted-foreground">{side}</span> : null}
    </Link>
  )
}
