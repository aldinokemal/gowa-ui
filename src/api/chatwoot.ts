import { http, results } from '@/lib/http'
import { isApiError } from '@/lib/api-error'

export interface ChatwootConfig {
  device_id: string
  device_jid: string
  chatwoot_url: string
  account_id: number
  inbox_id: number
  /** Masked: only the last 4 characters are visible. */
  api_token: string
  enabled: boolean
  /** Set this on the device's Chatwoot inbox; relative when the server has no public base. */
  webhook_url: string
  webhook_secret_set: boolean
  created_at: string
  updated_at: string
}

export interface ChatwootConfigPayload {
  chatwoot_url: string
  account_id: number
  inbox_id: number
  /** Required on create; omitted keeps the stored token. */
  api_token?: string
  enabled: boolean
  /** Omitted keeps the stored secret; an empty string removes it. */
  webhook_secret?: string
}

const path = (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}/chatwoot/config`

/** The device's config, or null when it has none yet. */
export async function getChatwootConfig(deviceId: string): Promise<ChatwootConfig | null> {
  try {
    return await results<ChatwootConfig>(http.get(path(deviceId)))
  } catch (error) {
    if (isApiError(error) && error.code === 'CONFIG_NOT_FOUND') return null
    throw error
  }
}

export function saveChatwootConfig(
  deviceId: string,
  payload: ChatwootConfigPayload,
): Promise<ChatwootConfig> {
  return results(http.put(path(deviceId), payload))
}

export async function deleteChatwootConfig(deviceId: string): Promise<void> {
  await http.delete(path(deviceId))
}
