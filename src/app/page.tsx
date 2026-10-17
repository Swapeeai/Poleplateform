import { Suspense } from "react"
import Link from "next/link"
import { MoveChips } from "@/components/bits"
import { PageFallback } from "@/components/page-fallback"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { copy } from "@/lib/copy"
import { getMovesByIds } from "@/lib/moves"
import { createClient } from "@/lib/supabase/server"

/** The three parts of the app, in the order the founder described them. */
const PARTS = [
  {
    href: "/ask",
    title: "1. Ask the Pole",
    body: "Stuck on a move? Post a short video. Teachers and members tell you how to fix it.",
    action: "Ask or help someone",
  },
  {
    href: "/moves",
    title: "2. Moves and combos",
    body: "The move dictionary with demos and other names. Build combos and join the weekly challenge.",
    action: "Explore moves",
  },
  {
    href: "/courses",
    title: "3. Courses",
    body: "Short courses from the founder, each with one clear goal.",
    action: "See courses",
  },
] as const

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
  const supabase = await createClient()
  const { data: saved } = await supabase
    .from("saved_moves")
    .select("move_id")
    .eq("user_id", session.userId)
    .eq("status", "working_on")
    .order("updated_at", { ascending: false })
    .limit(8)
  const workingOn = await getMovesByIds((saved ?? []).map((row) => row.move_id as string))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi{profile ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{copy.homeLead}</p>
      </div>

      {!profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile missing</CardTitle>
            <CardDescription>{copy.profileMissing}</CardDescription>
          </CardHeader>
        </Card>
      ) : !profile.profile_completed_at ? (
        <Card>
          <CardHeader>
            <CardTitle>{copy.finishProfileTitle}</CardTitle>
            <CardDescription>{copy.finishProfileBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/profile/edit" />} className="h-11 w-full text-base">
              {copy.editProfile}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {PARTS.map((part) => (
        <Card key={part.href}>
          <CardHeader>
            <CardTitle className="text-lg">{part.title}</CardTitle>
            <CardDescription className="text-base">{part.body}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href={part.href} />} variant="outline" className="h-11 w-full text-base">
              {part.action}
            </Button>
          </CardContent>
        </Card>
      ))}

      {workingOn.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Moves you are working on</h2>
          <MoveChips moves={workingOn} />
        </section>
      ) : null}
    </div>
  )
}
