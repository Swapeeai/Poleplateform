import { Suspense } from "react"
import Link from "next/link"
import { PageFallback } from "@/components/page-fallback"
import { ProfileSummary } from "@/components/profile-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"

export default function HomePage() {
  return (
    <Suspense fallback={<PageFallback label="Loading your home…" />}>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  const session = await requireUser()
  const profile = session.profile

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.home}</h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.homeLead}</p>
      </div>

      {!profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile missing</CardTitle>
            <CardDescription>{copy.profileMissing}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {!profile.profile_completed_at ? (
            <Card>
              <CardHeader>
                <CardTitle>{copy.finishProfileTitle}</CardTitle>
                <CardDescription>{copy.finishProfileBody}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  render={<Link href="/profile/edit" />}
                  className="h-11 w-full text-base"
                >
                  {copy.editProfile}
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardContent className="pt-4">
              <ProfileSummary profile={profile} />
            </CardContent>
          </Card>
          <Button render={<Link href="/profile" />} variant="outline" className="h-11 w-full text-base">
            {copy.profile}
          </Button>
        </>
      )}

      <p className="text-sm text-muted-foreground">{copy.homeLater}</p>
    </div>
  )
}
