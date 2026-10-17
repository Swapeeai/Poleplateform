import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseEnv } from "@/lib/supabase/env"

/**
 * A new Supabase client for this request. Call it from pages, actions, and
 * route handlers. Do not reuse it across requests.
 *
 * Setting cookies can fail inside a Server Component. That is expected.
 * src/proxy.ts writes the refreshed login cookie before the page renders.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write cookies. The proxy already did.
        }
      },
    },
  })
}
