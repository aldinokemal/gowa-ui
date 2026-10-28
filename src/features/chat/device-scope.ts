import type { ChatInfo } from '@/api/chat'

export interface ChatListFilters {
  search: string
  hasMedia: boolean
  offset: number
}

export interface ChatMessagesFilters {
  search: string
  mediaOnly: boolean
  offset: number
}

export interface ChatSelection {
  deviceId: string
  chat: ChatInfo
}

export function chatListQueryKey(
  deviceId: string,
  filters: ChatListFilters,
  connectionId: string | null,
) {
  return ['chats', deviceId, filters, connectionId] as const
}

export function chatMessagesQueryKey(
  deviceId: string,
  chatJid: string,
  filters: ChatMessagesFilters,
  connectionId: string | null,
) {
  return ['chat-messages', deviceId, chatJid, filters, connectionId] as const
}

export function messageMediaQueryKey(
  deviceId: string,
  messageId: string,
  chatJid: string,
  connectionId: string | null,
) {
  return ['media', deviceId, messageId, chatJid, connectionId] as const
}

export function selectedChatForDevice(
  selection: ChatSelection | null,
  deviceId: string | null,
): ChatInfo | null {
  return selection?.deviceId === deviceId ? selection.chat : null
}
