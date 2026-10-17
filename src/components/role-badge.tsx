import { Badge } from "@/components/ui/badge"
import { copy } from "@/lib/copy"
import { roleLabel, type AppRole } from "@/lib/profile"

export function RoleBadge({
  role,
  verified,
}: {
  role: AppRole
  verified?: boolean
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge variant={role === "admin" ? "default" : "secondary"}>{roleLabel[role]}</Badge>
      {verified ? <Badge variant="outline">{copy.verifiedTeacher}</Badge> : null}
    </span>
  )
}
