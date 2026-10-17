import { ProtectedVideo } from "@/components/protected-video"
import { createClient } from "@/lib/supabase/server"

/** Links to private files stop working after this many seconds. */
const LINK_SECONDS = 60 * 60

/**
 * Shows one uploaded video or picture. The database decides if this person
 * may see it; if not, a short note shows instead.
 */
export async function MediaView({ id, alt = "" }: { id: string | null; alt?: string }) {
  if (!id) return null

  const supabase = await createClient()
  const { data: asset } = await supabase
    .from("media_assets")
    .select("storage_path, kind, mute_audio")
    .eq("id", id)
    .maybeSingle()

  if (!asset) return <LockedMedia />

  const { data: link } = await supabase.storage
    .from("media")
    .createSignedUrl(asset.storage_path as string, LINK_SECONDS)

  if (!link?.signedUrl) return <LockedMedia />

  if (asset.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed links change every hour, so the image optimiser cannot cache them
      <img src={link.signedUrl} alt={alt} className="w-full rounded-lg object-cover" />
    )
  }

  return <ProtectedVideo src={link.signedUrl} muted={Boolean(asset.mute_audio)} />
}

function LockedMedia() {
  return (
    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      This file is not available to you.
    </p>
  )
}
