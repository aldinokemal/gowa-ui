import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DeviceState } from '@/api/types'

const stateStyles: Record<DeviceState, string> = {
  logged_in: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  connected: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  connecting: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  disconnected: 'bg-muted text-muted-foreground',
}

const stateLabels: Record<DeviceState, string> = {
  logged_in: 'Logged in',
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
}

export function StateBadge({ state }: { state: DeviceState }) {
  return (
    <Badge variant="secondary" className={cn('border-transparent', stateStyles[state])}>
      {stateLabels[state] ?? state}
    </Badge>
  )
}
