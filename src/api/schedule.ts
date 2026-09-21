import { http, results } from '@/lib/http'

export type ScheduleStatus = 'active' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface ScheduledSend {
  id: string
  message_type: string
  phone: string
  summary?: string
  status: ScheduleStatus
  scheduled_at: string
  next_run_at?: string
  timezone: string
  recurrence: string
  weekdays?: number[]
  day_of_month?: number
  end_at?: string
  occurrence_limit?: number
  occurrence_count: number
  attempts: number
  last_run_at?: string
  last_message_id?: string
  last_error?: string
  created_at: string
  updated_at: string
}

export function listSchedules(status?: string): Promise<ScheduledSend[]> {
  return results<ScheduledSend[]>(http.get('/send/schedules', { params: status ? { status } : undefined }))
}

export function getSchedule(id: string): Promise<ScheduledSend> {
  return results<ScheduledSend>(http.get(`/send/schedules/${encodeURIComponent(id)}`))
}

function action(id: string, name: 'pause' | 'resume' | 'cancel'): Promise<void> {
  return http.post(`/send/schedules/${encodeURIComponent(id)}/${name}`).then(() => undefined)
}

export const pauseSchedule = (id: string) => action(id, 'pause')
export const resumeSchedule = (id: string) => action(id, 'resume')
export const cancelSchedule = (id: string) => action(id, 'cancel')
