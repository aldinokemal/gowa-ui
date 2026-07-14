import type { DeviceStatus, LoginQr, PairCode, RegistryDevice } from '@/api/types'
import { http, results } from '@/lib/http'

export interface AddDevicePayload {
  device_id?: string
  webhook_url?: string
  webhook_secret?: string
  webhook_events?: string
  webhook_insecure_skip_verify?: boolean
}

const enc = encodeURIComponent

export async function listDevices(): Promise<RegistryDevice[]> {
  return (await results<RegistryDevice[]>(http.get('/devices'))) ?? []
}

export async function addDevice(payload: AddDevicePayload): Promise<RegistryDevice> {
  return results(http.post('/devices', payload))
}

export async function removeDevice(deviceId: string): Promise<void> {
  await http.delete(`/devices/${enc(deviceId)}`)
}

export async function loginDevice(deviceId: string): Promise<LoginQr> {
  return results(http.get(`/devices/${enc(deviceId)}/login`))
}

export async function loginDeviceWithCode(deviceId: string, phone: string): Promise<PairCode> {
  return results(http.post(`/devices/${enc(deviceId)}/login/code`, undefined, { params: { phone } }))
}

export async function logoutDevice(deviceId: string): Promise<void> {
  await http.post(`/devices/${enc(deviceId)}/logout`)
}

export async function reconnectDevice(deviceId: string): Promise<void> {
  await http.post(`/devices/${enc(deviceId)}/reconnect`)
}

export async function deviceStatus(deviceId: string): Promise<DeviceStatus> {
  return results(http.get(`/devices/${enc(deviceId)}/status`))
}

export interface DeviceWebhookConfig {
  device_id: string
  webhook_url: string
  webhook_secret: string
  webhook_events: string
  webhook_insecure_skip_verify: boolean
}

export interface UpdateDeviceWebhookPayload {
  /** Required by the API; an empty string disables the webhook. */
  webhook_url: string
  webhook_secret?: string
  webhook_events?: string
  webhook_insecure_skip_verify?: boolean
}

export async function getDeviceWebhook(deviceId: string): Promise<DeviceWebhookConfig> {
  return results(http.get(`/devices/${enc(deviceId)}/webhook`))
}

export async function updateDeviceWebhook(
  deviceId: string,
  payload: UpdateDeviceWebhookPayload,
): Promise<DeviceWebhookConfig> {
  return results(http.patch(`/devices/${enc(deviceId)}/webhook`, payload))
}
