"use client"

/**
 * Video player without a download button, picture-in-picture, or right-click
 * menu. This only makes saving harder; a determined person can still record
 * the screen.
 *
 * When the uploader asked for the sound to be removed, the player keeps it
 * muted. The sound is still in the file until a video service strips it.
 */
export function ProtectedVideo({ src, muted }: { src: string; muted: boolean }) {
  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      muted={muted}
      disablePictureInPicture
      controlsList="nodownload noremoteplayback noplaybackrate"
      onContextMenu={(event) => event.preventDefault()}
      onVolumeChange={(event) => {
        if (muted && !event.currentTarget.muted) event.currentTarget.muted = true
      }}
      className="max-h-[70vh] w-full rounded-lg bg-black object-contain"
    />
  )
}
