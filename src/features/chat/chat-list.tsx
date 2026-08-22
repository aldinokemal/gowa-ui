import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import { listChats, type ChatInfo } from '@/api/chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { chatListQueryKey } from '@/features/chat/device-scope'
import { formatDate, isZeroTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

export function ChatList({
  deviceId,
  selectedJid,
  onSelect,
}: {
  deviceId: string
  selectedJid: string | null
  onSelect: (chat: ChatInfo) => void
}) {
  const [search, setSearch] = useState('')
  const [hasMedia, setHasMedia] = useState(false)
  const [offset, setOffset] = useState(0)

  const query = useQuery({
    queryKey: chatListQueryKey(deviceId, { search, hasMedia, offset }),
    queryFn: () =>
      listChats(
        {
          search: search || undefined,
          has_media: hasMedia || undefined,
          limit: PAGE_SIZE,
          offset,
        },
        deviceId,
      ),
    placeholderData: keepPreviousData,
  })

  const chats = query.data?.data ?? []
  const total = query.data?.pagination.total ?? 0

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            className="pl-8"
            placeholder="Search chats"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setOffset(0)
            }}
          />
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <Switch
            checked={hasMedia}
            onCheckedChange={(value) => {
              setHasMedia(value)
              setOffset(0)
            }}
          />
          With media only
        </label>
      </div>

      <ScrollArea className="min-h-0 flex-1 rounded-md border">
        {query.isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : chats.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">No chats found</p>
        ) : (
          <ul className="divide-y">
            {chats.map((chat) => (
              <li key={chat.jid}>
                <button
                  type="button"
                  onClick={() => onSelect(chat)}
                  className={cn(
                    'hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    selectedJid === chat.jid && 'bg-accent/60',
                  )}
                >
                  <span className="bg-accent font-heading text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {(chat.name || chat.jid).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="w-full truncate text-sm font-medium">
                      {chat.name || chat.jid}
                    </span>
                    <span className="text-muted-foreground w-full truncate text-xs">
                      {isZeroTime(chat.last_message_time)
                        ? chat.jid
                        : formatDate(chat.last_message_time)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{total} chats</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
