import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Loader2 } from 'lucide-react'
import { downloadMedia } from '@/api/message'
import { Button } from '@/components/ui/button'
import { messageMediaQueryKey } from '@/features/chat/device-scope'
import { toApiError } from '@/lib/api-error'
import { formatBytes } from '@/lib/format'
import { rerootServerUrl } from '@/lib/url'
import { useAppInfo } from '@/hooks/use-app-info'
import { useConnection } from '@/stores/connection'
import type { MessageInfo } from '@/api/chat'

/** Lazily downloads media for a message and renders it inline once fetched. */
export function MessageMedia({ message, deviceId }: { message: MessageInfo; deviceId: string }) {
  const [open, setOpen] = useState(false)
  const baseUrl = useConnection((state) => state.baseUrl)
  const { data: info } = useAppInfo()

  const query = useQuery({
    queryKey: messageMediaQueryKey(deviceId, message.id, message.chat_jid),
    queryFn: () => downloadMedia(message.id, message.chat_jid, deviceId),
    enabled: open,
    staleTime: Infinity,
    retry: false,
  })

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-1" onClick={() => setOpen(true)}>
        <Download className="size-3.5" />
        {message.media_type}
        {message.file_length ? ` · ${formatBytes(message.file_length)}` : ''}
      </Button>
    )
  }

  if (query.isLoading) {
    return <Loader2 className="text-muted-foreground mt-1 size-4 animate-spin" />
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-destructive mt-1 text-xs">
        {query.error ? toApiError(query.error).message : 'Download failed'}
      </p>
    )
  }

  const src = rerootServerUrl(baseUrl ?? '', query.data.file_path, info?.base_path ?? '')
  const type = message.media_type

  return (
    <div className="mt-1">
      {type === 'image' ? (
        <img src={src} alt={query.data.filename} className="max-h-64 rounded-md" />
      ) : type === 'video' ? (
        <video src={src} controls className="max-h-64 rounded-md" />
      ) : type === 'audio' ? (
        <audio src={src} controls />
      ) : (
        <a href={src} target="_blank" rel="noreferrer" className="text-primary text-sm underline">
          {query.data.filename || 'Download file'}
        </a>
      )}
    </div>
  )
}
