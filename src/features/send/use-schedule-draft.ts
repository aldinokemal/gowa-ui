import { useState } from 'react'
import type { ScheduleFields } from '@/api/send'

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function emptyDraft(): ScheduleFields {
  return { timezone: browserTimezone(), recurrence: 'once' }
}

export function useScheduleDraft() {
  const [draft, setDraft] = useState<ScheduleFields>(emptyDraft)
  const patch = (change: Partial<ScheduleFields>) => setDraft((current) => ({ ...current, ...change }))
  const reset = () => setDraft(emptyDraft())
  return { draft, patch, reset }
}
