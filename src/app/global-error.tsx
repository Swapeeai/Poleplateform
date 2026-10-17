"use client"

export default function GlobalError({
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <html lang="en">
      <body>
        <h1>APP_NAME</h1>
        <p>Something went wrong. Try again.</p>
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  )
}
