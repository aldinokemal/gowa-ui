import { useState } from 'react'
import type { ScheduleFields } from '@/api/send'

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function useScheduleDraft() {
  const [draft, setDraft] = useState<ScheduleFields>({ timezone: browserTimezone(), recurrence: 'once' })
  const patch = (change: Partial<ScheduleFields>) => setDraft((current) => ({ ...current, ...change }))
  return { draft, patch }
}
