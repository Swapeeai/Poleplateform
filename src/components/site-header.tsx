import Link from "next/link"
import { signOut } from "@/app/actions/auth"
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

export async function SiteHeader() {
  const session = await getCurrentSession()

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-lg flex-wrap items-center gap-2 px-4 py-2">
        <Link href={session ? "/" : "/sign-in"} className="mr-auto text-base font-semibold">
          {APP_NAME}
        </Link>
        {session ? (
          <>
            <Link className="inline-flex h-11 items-center px-2 text-base" href="/">
              {copy.home}
            </Link>
            <Link className="inline-flex h-11 items-center px-2 text-base" href="/profile">
              {copy.profile}
            </Link>
            {session.profile?.role === "admin" ? (
              <Link className="inline-flex h-11 items-center px-2 text-base" href="/admin">
                {copy.members}
              </Link>
            ) : null}
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="h-11 px-2 text-base">
                {copy.signOut}
              </Button>
            </form>
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
