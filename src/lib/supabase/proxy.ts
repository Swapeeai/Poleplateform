import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { hasSupabaseEnv, getSupabaseEnv } from "@/lib/supabase/env"

function isPublicPath(pathname: string): boolean {
  return pathname === "/sign-in" || pathname === "/sign-up" || pathname.startsWith("/auth/")
}

function withCopiedHeaders(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
  // Supabase asks us to mark auth responses as private so a shared cache
  // cannot hand one person's login cookie to someone else.
  ;["cache-control", "expires", "pragma"].forEach((name) => {
    const value = from.headers.get(name)
    if (value) to.headers.set(name, value)
  })
  return to
}

/**
 * Refresh the login cookie, then send guests to sign-in.
 * This is a fast gate. Pages and server actions check the user again.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!hasSupabaseEnv()) {
    if (isPublicPath(pathname)) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = ""
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
  })

  // getClaims checks the token and refreshes it when it is close to expiry.
  // The role check lives in Postgres, not in this cookie.
  let signedIn = false
  try {
    const { data, error } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims?.sub) && !error
  } catch {
    signedIn = false
  }

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = ""
    if (pathname !== "/") url.searchParams.set("next", pathname)
    return withCopiedHeaders(supabaseResponse, NextResponse.redirect(url))
  }

  if (signedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return withCopiedHeaders(supabaseResponse, NextResponse.redirect(url))
  }

  return supabaseResponse
}
