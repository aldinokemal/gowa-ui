import { http, results } from '@/lib/http'

export interface ChatInfo {
  jid: string
  name: string
  last_message_time: string
  ephemeral_expiration: number
  created_at: string
  updated_at: string
  archived: boolean
}

export interface Pagination {
  limit: number
  offset: number
  total: number
}

export interface ReactionInfo {
  emoji: string
  sender_jid: string
  sender_display_name?: string
  is_from_me: boolean
  timestamp: string
}

export interface MessageInfo {
  id: string
  chat_jid: string
  sender_jid: string
  sender_display_name?: string
  content: string
  timestamp: string
  is_from_me: boolean
  media_type: string
  reactions?: ReactionInfo[]
  filename: string
  url: string
  file_length: number
}

export interface ListChatsParams {
  limit?: number
  offset?: number
  search?: string
  has_media?: boolean
}

export interface ChatMessagesParams {
  limit?: number
  offset?: number
  search?: string
  media_only?: boolean
  is_from_me?: boolean
  start_time?: string
  end_time?: string
}

const enc = encodeURIComponent

export function listChats(params: ListChatsParams, deviceId: string) {
  return results<{ data: ChatInfo[]; pagination: Pagination }>(
    http.get('/chats', {
      params,
      headers: { 'X-Device-Id': encodeURIComponent(deviceId) },
    }),
  )
}

export function getChatMessages(chatJid: string, params: ChatMessagesParams, deviceId: string) {
  return results<{ data: MessageInfo[]; pagination: Pagination; chat_info: ChatInfo }>(
    http.get(`/chat/${enc(chatJid)}/messages`, {
      params,
      headers: { 'X-Device-Id': encodeURIComponent(deviceId) },
    }),
  )
}

export function pinChat(chatJid: string, pinned: boolean) {
  return results(http.post(`/chat/${enc(chatJid)}/pin`, { pinned }))
}

export function archiveChat(chatJid: string, archived: boolean) {
  return results(http.post(`/chat/${enc(chatJid)}/archive`, { archived }))
}

export function setDisappearing(chatJid: string, timer_seconds: number) {
  return results(http.post(`/chat/${enc(chatJid)}/disappearing`, { timer_seconds }))
}
