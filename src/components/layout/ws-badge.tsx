import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWsStore, type WsStatus } from '@/lib/ws'
import { cn } from '@/lib/utils'

const dotStyles: Record<WsStatus, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-muted-foreground/40',
}

const labels: Record<WsStatus, string> = {
  connected: 'Live updates connected',
  connecting: 'Live updates reconnecting…',
  disconnected: 'Live updates offline',
}

export function WsBadge() {
  const status = useWsStore((state) => state.status)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center px-1" aria-label={labels[status]}>
          <span className={cn('size-2.5 rounded-full', dotStyles[status])} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{labels[status]}</TooltipContent>
    </Tooltip>
  )
}
