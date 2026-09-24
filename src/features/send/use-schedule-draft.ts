import { useState } from 'react'
import { TZDate } from '@date-fns/tz'
import type { ScheduleFields } from '@/api/send'

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function parseIso(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * The instant at `hours:minutes` on `day`'s calendar date, both read in
 * `timeZone`. Returned as a plain Date: TZDate#toISOString keeps the zone's
 * offset, and the wire format is UTC.
 */
export function atTime(day: Date, hours: number, minutes: number, timeZone: string) {
  const next = new TZDate(day, timeZone)
  next.setHours(hours, minutes, 0, 0)
  return new Date(next.getTime())
}

/** Moves `value` to `to` while keeping the date and time it showed in `from`. */
export function rezone(value: string | undefined, from: string, to: string) {
  const date = parseIso(value)
  if (!date) return value
  const wall = new TZDate(date, from)
  const moved = new TZDate(
    wall.getFullYear(),
    wall.getMonth(),
    wall.getDate(),
    wall.getHours(),
    wall.getMinutes(),
    to,
  )
  return new Date(moved.getTime()).toISOString()
}

/** The first whole minute strictly after `date`, so a clamped time is one the server accepts. */
export function nextMinute(date: Date) {
  return new Date((Math.floor(date.getTime() / 60_000) + 1) * 60_000)
}

function emptyDraft(): ScheduleFields {
  return { timezone: browserTimezone(), recurrence: 'once' }
}

export function useScheduleDraft() {
  const [draft, setDraft] = useState<ScheduleFields>(emptyDraft)
  const patch = (change: Partial<ScheduleFields>) =>
    setDraft((current) => ({ ...current, ...change }))
  const reset = () => setDraft(emptyDraft())
  return { draft, patch, reset }
}
