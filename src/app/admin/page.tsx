import { Suspense } from "react"
import { MemberForm } from "@/components/member-form"
import { PageFallback } from "@/components/page-fallback"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"
import { toMember, type Member } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"

export default function AdminPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading members…" />}>
      <AdminContent />
    </Suspense>
  )
}

async function AdminContent() {
  const session = await requireUser()

  if (session.profile?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.adminDenied}</CardTitle>
          <CardDescription>{copy.adminDeniedBody}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_list_members")
  const members = Array.isArray(data)
    ? data.map((row) => toMember(row)).filter((row): row is Member => row !== null)
    : []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.adminTitle}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.adminLead}</p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.notAllowed}
        </p>
      ) : null}
      <Card>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-base text-muted-foreground">{copy.adminEmpty}</p>
          ) : (
            members.map((member) => (
              <MemberForm key={member.id} member={member} isYou={member.id === session.userId} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
