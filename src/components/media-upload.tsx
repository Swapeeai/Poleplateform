"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MAX_UPLOAD_BYTES, visibilityLabel, type Visibility } from "@/lib/labels"
import { createClient } from "@/lib/supabase/client"

type Status =
  | { step: "empty" }
  | { step: "working"; note: string }
  | { step: "done"; id: string; fileName: string }
  | { step: "failed"; note: string }

const VIDEO_TYPES = "video/mp4,video/quicktime,video/webm"
const IMAGE_TYPES = "image/jpeg,image/png,image/webp"

/**
 * Upload field for one video or picture.
 *
 * The file goes straight from the phone to Supabase Storage, into the
 * person's own folder. Then a media_assets row records who may see it.
 * The form only sends the new row's id (in a hidden field called `name`),
 * never the file itself.
 */
export function MediaUpload({
  name,
  ownerId,
  kind,
  label,
  hint,
  maxSeconds,
  visibilities = ["members"],
  required = false,
}: {
  name: string
  ownerId: string
  kind: "video" | "image"
  label: string
  hint?: string
  maxSeconds?: number
  visibilities?: Visibility[]
  required?: boolean
}) {
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ step: "empty" })
  const [visibility, setVisibility] = useState<Visibility>(visibilities[0] ?? "members")
  const [muteAudio, setMuteAudio] = useState(false)
  const locked = status.step === "working" || status.step === "done"

  async function upload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus({ step: "failed", note: "That file is bigger than 200 MB. Trim it and try again." })
      return
    }

    let seconds: number | null = null
    if (kind === "video") {
      setStatus({ step: "working", note: "Checking the video…" })
      seconds = await readDuration(file)
      if (seconds === null) {
        setStatus({ step: "failed", note: "This video could not be read. Try an MP4 or MOV file." })
        return
      }
      if (maxSeconds && seconds > maxSeconds) {
        setStatus({
          step: "failed",
          note: `This video is ${Math.round(seconds)} seconds. The limit here is ${maxSeconds} seconds. Trim it and try again.`,
        })
        return
      }
    }

    setStatus({ step: "working", note: "Uploading… keep this page open." })
    const supabase = createClient()
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
    const path = `${ownerId}/${crypto.randomUUID()}.${extension}`

    const uploaded = await supabase.storage
      .from("media")
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploaded.error) {
      setStatus({ step: "failed", note: uploadError(uploaded.error.message) })
      return
    }

    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        owner_id: ownerId,
        kind,
        storage_path: path,
        visibility,
        duration_seconds: seconds,
        mute_audio: kind === "video" && muteAudio,
      })
      .select("id")
      .single()

    if (error || !data) {
      await supabase.storage.from("media").remove([path])
      setStatus({ step: "failed", note: "The file uploaded but could not be saved. Try again." })
      return
    }
    setStatus({ step: "done", id: data.id as string, fileName: file.name })
  }

  // On a slow phone someone can pick a file before the page is ready, and that
  // choice would be missed. Pick it up once the page is ready.
  const uploadRef = useRef(upload)
  useEffect(() => {
    uploadRef.current = upload
  })
  useEffect(() => {
    const early = inputRef.current?.files?.[0]
    if (early) void uploadRef.current(early)
  }, [])

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      {visibilities.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-who`}>Who can see it</Label>
          <select
            id={`${fieldId}-who`}
            value={visibility}
            disabled={locked}
            onChange={(event) => setVisibility(event.target.value as Visibility)}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
          >
            {visibilities.map((option) => (
              <option key={option} value={option}>
                {visibilityLabel[option]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {kind === "video" ? (
        <label className="flex items-start gap-3 text-base">
          <input
            type="checkbox"
            checked={muteAudio}
            disabled={locked}
            onChange={(event) => setMuteAudio(event.target.checked)}
            className="mt-1 size-5"
          />
          <span>
            Play without sound
            <span className="block text-sm text-muted-foreground">
              Tick this if there is music or talking you do not want others to hear.
            </span>
          </span>
        </label>
      ) : null}

      <input type="hidden" name={name} value={status.step === "done" ? status.id : ""} />

      {status.step === "done" ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">Uploaded: {status.fileName}</p>
          <Button type="button" variant="outline" onClick={() => setStatus({ step: "empty" })}>
            Change
          </Button>
        </div>
      ) : (
        <input
          ref={inputRef}
          id={fieldId}
          type="file"
          accept={kind === "video" ? VIDEO_TYPES : IMAGE_TYPES}
          required={required}
          disabled={status.step === "working"}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
          className="text-base file:mr-3 file:h-11 file:rounded-lg file:border file:bg-transparent file:px-3"
        />
      )}

      {status.step === "working" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {status.note}
        </p>
      ) : null}
      {status.step === "failed" ? (
        <p className="text-sm text-destructive" role="alert">
          {status.note}
        </p>
      ) : null}
    </fieldset>
  )
}

/** Length of a video file in seconds, rounded to one decimal like the database. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      const seconds = video.duration
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 10) / 10 : null)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    video.src = url
  })
}

function uploadError(message: string): string {
  if (/size|too large|exceeded/i.test(message)) {
    return "That file is too big for the storage plan. The Supabase free plan allows 50 MB per file."
  }
  if (/mime|type/i.test(message)) return "That file type is not allowed. Use MP4, MOV, WEBM, JPG, PNG or WEBP."
  return "The upload failed. Check your connection and try again."
}
