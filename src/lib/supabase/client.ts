"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/lib/supabase/env"

/**
 * Supabase from the browser. Only used to upload video and picture files
 * straight to Storage, so big files do not pass through the app server.
 * The same database rules apply as on the server.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
