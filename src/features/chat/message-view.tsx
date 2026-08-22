import { useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send } from 'lucide-react'
import { getChatMessages, type ChatInfo, type MessageInfo } from '@/api/chat'
import { sendText } from '@/api/send'
import { MessageMedia } from '@/features/chat/message-media'
import { ChatControls } from '@/features/chat/chat-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { chatMessagesQueryKey } from '@/features/chat/device-scope'
import { chatDisplayName, senderDisplayName } from '@/features/chat/display-name'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 30

function sortMessagesChronologically(messages: MessageInfo[]): MessageInfo[] {
  return [...messages].sort((left, right) => {
    return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  })
}

function dayKey(timestamp: string): string {
  return new Date(timestamp).toDateString()
}

function MessageBubble({ message, deviceId }: { message: MessageInfo; deviceId: string }) {
  const hasMedia = message.media_type && message.media_type !== ''
  return (
    <div className={cn('flex', message.is_from_me ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-xs',
          message.is_from_me ? 'bg-bubble-out rounded-br-sm' : 'bg-bubble-in rounded-bl-sm border',
        )}
      >
        {!message.is_from_me && (
          <p className="text-muted-foreground mb-0.5 font-mono text-xs">
            {senderDisplayName(message)}
          </p>
        )}
        {message.content && <p className="break-words whitespace-pre-wrap">{message.content}</p>}
        {hasMedia && <MessageMedia message={message} deviceId={deviceId} />}
        {message.reactions && message.reactions.length > 0 && (
          <p className="mt-1 text-xs">{message.reactions.map((r) => r.emoji).join(' ')}</p>
        )}
        <p className="text-muted-foreground mt-1 text-right text-[10px]">
          {formatDate(message.timestamp)}
        </p>
      </div>
    </div>
  )
}

export function MessageView({ chat, deviceId }: { chat: ChatInfo; deviceId: string }) {
  const queryClient = useQueryClient()
  const messageList = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [mediaOnly, setMediaOnly] = useState(false)
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState('')

  const query = useQuery({
    queryKey: chatMessagesQueryKey(deviceId, chat.jid, { search, mediaOnly, offset }),
    queryFn: () =>
      getChatMessages(
        chat.jid,
        {
          search: search || undefined,
          media_only: mediaOnly || undefined,
          limit: PAGE_SIZE,
          offset,
        },
        deviceId,
      ),
    placeholderData: keepPreviousData,
  })

  const messages = useMemo(
    () => sortMessagesChronologically(query.data?.data ?? []),
    [query.data?.data],
  )
  const total = query.data?.pagination.total ?? 0
  const responseChat = query.data?.chat_info
  const resolvedChat = responseChat?.jid === chat.jid ? responseChat : chat

  useLayoutEffect(() => {
    const viewport = messageList.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    )
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [chat.jid, messages])

  const sendMutation = useActionMutation(
    (message: string) => sendText({ phone: chat.jid, message }),
    {
      successMessage: 'Message sent',
      onSuccess: () => {
        setDraft('')
        void queryClient.invalidateQueries({
          queryKey: ['chat-messages', deviceId, chat.jid],
        })
      },
    },
  )

  const onSend = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim()) sendMutation.mutate(draft.trim())
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2 border-b pb-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{chatDisplayName(resolvedChat)}</h2>
          <p className="text-muted-foreground truncate font-mono text-xs">{resolvedChat.jid}</p>
        </div>
        <ChatControls chat={resolvedChat} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="sm:max-w-xs"
          placeholder="Search messages"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setOffset(0)
          }}
        />
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={mediaOnly}
            onCheckedChange={(value) => {
              setMediaOnly(value)
              setOffset(0)
            }}
          />
          Media only
        </label>
      </div>

      <div ref={messageList} className="min-h-0 flex-1">
        <ScrollArea className="bg-muted/40 size-full rounded-lg border p-3">
          {query.isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-muted-foreground flex flex-col gap-1 p-6 text-center text-sm">
              <p>No messages stored for this chat yet.</p>
              <p className="text-xs">
                Messages appear here as they are sent or received, and as WhatsApp history sync
                batches are processed after pairing. Contacts synced from your address book start
                without message history.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((message, index) => {
                const showDateSeparator =
                  index === 0 || dayKey(message.timestamp) !== dayKey(messages[index - 1].timestamp)
                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center py-1">
                        <span className="bg-card text-muted-foreground rounded-full border px-3 py-0.5 text-xs shadow-xs">
                          {new Date(message.timestamp).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <MessageBubble message={message} deviceId={deviceId} />
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{total} messages</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Newer
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Older
          </Button>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={onSend}>
        <Input
          placeholder="Type a message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" disabled={sendMutation.isPending || !draft.trim()}>
          {sendMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send
        </Button>
      </form>
    </div>
  )
}
