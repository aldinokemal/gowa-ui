import { useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { ChatList } from '@/features/chat/chat-list'
import { MessageView } from '@/features/chat/message-view'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { selectedChatForDevice, type ChatSelection } from '@/features/chat/device-scope'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'
import type { ChatInfo } from '@/api/chat'

export default function ChatsPage() {
  const device = useSelectedDevice()
  const [selection, setSelection] = useState<ChatSelection | null>(null)
  const messagePane = useRef<HTMLDivElement>(null)
  const selected = selectedChatForDevice(selection, device)

  // On stacked layouts the message pane sits below the fold, so bring it into view.
  const handleSelect = (chat: ChatInfo) => {
    if (!device) return
    setSelection({ deviceId: device, chat })
    messagePane.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (!device) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Chats" description="Stored conversations for this device." />
        <DeviceGuard />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100svh-8.5rem)]">
      <PageHeader title="Chats" description="Stored conversations for this device." />
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_1fr]">
        <Card className="h-[24rem] overflow-hidden p-3 lg:h-auto lg:min-h-0">
          <ChatList
            key={device}
            deviceId={device}
            selectedJid={selected?.jid ?? null}
            onSelect={handleSelect}
          />
        </Card>
        <Card
          ref={messagePane}
          className="h-[calc(100svh-9rem)] min-h-[26rem] overflow-hidden p-3 lg:h-auto lg:min-h-0"
        >
          {selected ? (
            <MessageView key={`${device}:${selected.jid}`} chat={selected} deviceId={device} />
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2">
              <MessagesSquare className="size-8" />
              <p className="text-sm">Select a chat to view its messages</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
