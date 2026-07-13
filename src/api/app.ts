import type { AppInfo } from '@/api/types'
import { http, results } from '@/lib/http'

export async function appInfo(): Promise<AppInfo> {
  return results(http.get('/app/info'))
}

export async function passkeyConfirm(deviceId: string): Promise<void> {
  await http.post('/app/passkey/confirm', undefined, {
    headers: { 'X-Device-Id': encodeURIComponent(deviceId) },
  })
}
