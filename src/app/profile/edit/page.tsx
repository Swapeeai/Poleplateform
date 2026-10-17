import { Suspense } from "react"
import { PageFallback } from "@/components/page-fallback"
import { ProfileForm } from "@/components/profile-form"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"

export default function EditProfilePage() {
  return (
    <Suspense fallback={<PageFallback label="Loading the form…" />}>
      <EditProfileContent />
    </Suspense>
  )
}

async function EditProfileContent() {
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.editProfile}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.finishProfileBody}</p>
      </div>
      <ProfileForm profile={session.profile} />
    </div>
  )
}
