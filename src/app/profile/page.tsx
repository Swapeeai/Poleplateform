import { Suspense } from "react"
import Link from "next/link"
import { PageFallback } from "@/components/page-fallback"
import { ProfileSummary } from "@/components/profile-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageFallback label="Loading your profile…" />}>
      <ProfileContent />
    </Suspense>
  )
}

async function ProfileContent() {
  const session = await requireUser()

  if (!session.profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile missing</CardTitle>
          <CardDescription>{copy.profileMissing}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.profile}</h1>
      <Card>
        <CardContent className="pt-4">
          <ProfileSummary profile={session.profile} />
        </CardContent>
      </Card>
      <Button render={<Link href="/profile/edit" />} className="h-11 w-full text-base">
        {copy.editProfile}
      </Button>
    </div>
  )
}
