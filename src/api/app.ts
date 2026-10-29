import type { AppInfo } from '@/api/types'
import { http, results } from '@/lib/http'

export async function appInfo(): Promise<AppInfo> {
  return results(http.get('/app/info'))
}

export interface AppMetrics {
  version: string
  session_store: 'sqlite' | 'postgres'
  devices: { total: number; logged_in: number; connected: number }
  system: {
    started_at: string
    uptime_seconds: number
    go_version: string
    /** Null fields are unknown on this platform (or unlimited, for the container limit). */
    cpu_seconds: number | null
    memory: {
      heap_alloc_bytes: number
      runtime_sys_bytes: number
      process_rss_bytes: number | null
      container_bytes: number | null
      container_limit_bytes: number | null
      goroutines: number
      gc_cycles: number
    }
    folders: Record<string, { bytes: number; files: number }>
    filesystem: { total_bytes: number | null; free_bytes: number | null }
  }
}

export async function appMetrics(): Promise<AppMetrics> {
  return results(http.get('/app/metrics'))
}

export async function passkeyConfirm(deviceId: string): Promise<void> {
  await http.post('/app/passkey/confirm', undefined, {
    headers: { 'X-Device-Id': encodeURIComponent(deviceId) },
  })
}
