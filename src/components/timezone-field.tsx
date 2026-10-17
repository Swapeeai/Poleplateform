"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * Sends how far this browser's clock is from UTC, so dates typed in a form
 * are saved in the admin's own time zone and not the server's.
 */
export function TimezoneField() {
  const offset = useSyncExternalStore(
    subscribe,
    () => String(new Date().getTimezoneOffset()),
    () => "0",
  )
  return <input type="hidden" name="timezoneOffset" value={offset} />
}
