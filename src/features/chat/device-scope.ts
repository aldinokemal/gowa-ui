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

export function chatListQueryKey(deviceId: string, filters: ChatListFilters) {
  return ['chats', deviceId, filters] as const
}

export function chatMessagesQueryKey(
  deviceId: string,
  chatJid: string,
  filters: ChatMessagesFilters,
) {
  return ['chat-messages', deviceId, chatJid, filters] as const
}

export function messageMediaQueryKey(deviceId: string, messageId: string, chatJid: string) {
  return ['media', deviceId, messageId, chatJid] as const
}

export function selectedChatForDevice(
  selection: ChatSelection | null,
  deviceId: string | null,
): ChatInfo | null {
  return selection?.deviceId === deviceId ? selection.chat : null
}
