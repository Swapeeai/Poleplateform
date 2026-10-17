import Link from "next/link"
import { signOut } from "@/app/actions/auth"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { getCurrentSession } from "@/lib/auth"
import { APP_NAME, copy } from "@/lib/copy"

export function HeaderFallback() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center px-4">
        <span className="text-base font-semibold">{APP_NAME}</span>
      </div>
    </header>
  )
}

/** Top bar with your profile, the admin area, and sign out. The main tabs sit at the bottom. */
export async function SiteHeader() {
  const session = await getCurrentSession()

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-lg flex-wrap items-center gap-1 px-4 py-1.5">
        <Link href={session ? "/" : "/sign-in"} className="mr-auto text-base font-semibold">
          {APP_NAME}
        </Link>
        {session ? (
          <>
            <Link className="inline-flex h-11 items-center px-2 text-base" href="/profile">
              {copy.me}
            </Link>
            {session.profile?.role === "admin" ? (
              <Link className="inline-flex h-11 items-center px-2 text-base" href="/admin">
                {copy.admin}
              </Link>
            ) : null}
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="h-11 px-2 text-base">
                {copy.signOut}
              </Button>
            </form>
            <BottomNav />
          </>
        ) : (
          <>
            <Link className="inline-flex h-11 items-center px-2 text-base" href="/sign-in">
              {copy.signIn}
            </Link>
            <Link className="inline-flex h-11 items-center px-2 text-base" href="/sign-up">
              {copy.createAccount}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
