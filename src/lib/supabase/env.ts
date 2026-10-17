/**
 * Public Supabase settings. The anon key is meant to be in the browser.
 * The service_role key must never be added here.
 */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("Supabase URL and anon key are missing. Copy .env.example to .env.local.")
  }
  return { url, anonKey }
}

export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  return siteUrl || "http://localhost:3000"
}
