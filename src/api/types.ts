export interface ResponseData<T> {
  code: string
  message: string
  results?: T
}

export interface ApiError {
  status: number
  code: string
  message: string
}

export type DeviceState = 'disconnected' | 'connecting' | 'connected' | 'logged_in'

export interface RegistryDevice {
  id: string
  phone_number?: string
  display_name?: string
  state: DeviceState
  jid?: string
  created_at: string
}

export interface AppInfo {
  version: string
  os: string
  base_path: string
  max_file_size: number
  max_video_size: number
  max_image_size: number
  chatwoot_enabled: boolean
}

export interface LoginQr {
  device_id: string
  qr_link: string
  qr_duration: number
}

export interface PairCode {
  device_id: string
  pair_code: string
}

export interface DeviceStatus {
  device_id: string
  is_connected: boolean
  is_logged_in: boolean
}
