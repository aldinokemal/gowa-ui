import type { ApiRequest } from '@/api/request'
import { http, results } from '@/lib/http'

const enc = encodeURIComponent

function messageRequest(
  messageId: string,
  action: string,
  json: Record<string, unknown>,
): ApiRequest {
  return { method: 'POST', path: `/message/${enc(messageId)}/${action}`, json }
}

export function reactRequest(messageId: string, payload: { phone: string; emoji: string }) {
  return messageRequest(messageId, 'reaction', payload)
}

export function revokeRequest(messageId: string, payload: { phone: string }) {
  return messageRequest(messageId, 'revoke', payload)
}

export function deleteRequest(messageId: string, payload: { phone: string }) {
  return messageRequest(messageId, 'delete', payload)
}

export function updateRequest(messageId: string, payload: { phone: string; message: string }) {
  return messageRequest(messageId, 'update', payload)
}

export function readRequest(messageId: string, payload: { phone: string }) {
  return messageRequest(messageId, 'read', payload)
}

export function starRequest(messageId: string, payload: { phone: string }) {
  return messageRequest(messageId, 'star', { ...payload, is_starred: true })
}

export function unstarRequest(messageId: string, payload: { phone: string }) {
  return messageRequest(messageId, 'unstar', { ...payload, is_starred: false })
}

export function forwardRequest(
  messageId: string,
  payload: { phone: string; force_reupload?: boolean },
) {
  return messageRequest(messageId, 'forward', payload)
}

export interface DownloadedMedia {
  message_id: string
  media_type: string
  filename: string
  file_path: string
  file_url?: string
  file_size: number
}

export function downloadMedia(messageId: string, phone: string, deviceId: string) {
  return results<DownloadedMedia>(
    http.get(`/message/${enc(messageId)}/download`, {
      params: { phone },
      headers: { 'X-Device-Id': encodeURIComponent(deviceId) },
    }),
  )
}
