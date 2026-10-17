import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { copy } from "@/lib/copy"

/** Shown instead of an admin page to anyone who is not an admin. */
export function AdminDenied() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.adminDenied}</CardTitle>
        <CardDescription>{copy.adminDeniedBody}</CardDescription>
      </CardHeader>
    </Card>
  )
}
