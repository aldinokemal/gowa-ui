type ChatIdentity = {
  jid: string
  name?: string | null
}

type SenderIdentity = {
  sender_jid: string
  sender_display_name?: string | null
}

export function chatDisplayName(chat: ChatIdentity): string {
  const name = chat.name?.trim()
  return name || chat.jid
}

export function senderDisplayName(message: SenderIdentity): string {
  const name = message.sender_display_name?.trim()
  return name || message.sender_jid
}
