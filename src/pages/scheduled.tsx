import { useState, type ComponentType } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Pause, Play, XCircle } from 'lucide-react'
import {
  listSchedules,
  pauseSchedule,
  resumeSchedule,
  cancelSchedule,
  type ScheduledSend,
  type ScheduleStatus,
} from '@/api/schedule'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

const STATUS_FILTERS: { value: ScheduleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function statusVariant(status: ScheduledSend['status']) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'completed' || status === 'active' || status === 'running')
    return 'default' as const
  return 'secondary' as const
}

function IconAction({
  icon: Icon,
  label,
  variant = 'outline',
  disabled,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  variant?: 'outline' | 'destructive'
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ScheduleCard({ item, refresh }: { item: ScheduledSend; refresh: () => void }) {
  const pause = useActionMutation(pauseSchedule, {
    successMessage: 'Schedule paused',
    onSuccess: refresh,
  })
  const resume = useActionMutation(resumeSchedule, {
    successMessage: 'Schedule resumed',
    onSuccess: refresh,
  })
  const cancel = useActionMutation(cancelSchedule, {
    successMessage: 'Schedule cancelled',
    onSuccess: refresh,
  })
  const pending = pause.isPending || resume.isPending || cancel.isPending
  const isActive = item.status === 'active' || item.status === 'running'
  const isClosed = item.status === 'completed' || item.status === 'cancelled'

  // One dot-separated line instead of a 2x2 label/value grid. Attempts only
  // earn a slot once a run has actually failed.
  const meta = [
    item.next_run_at ? formatDate(item.next_run_at) : 'No next run',
    item.timezone ? `${item.recurrence} · ${item.timezone}` : item.recurrence,
    `${item.occurrence_count}${item.occurrence_limit ? `/${item.occurrence_limit}` : ''} sent`,
    item.attempts > 0 ? `${item.attempts} attempts` : null,
  ].filter(Boolean)

  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-medium">
              <span className="capitalize">{item.message_type}</span> to {item.phone}
            </p>
            <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {item.summary || 'Scheduled message'}
          </p>
          <p className="text-muted-foreground text-xs">{meta.join(' · ')}</p>
          {item.last_error && <p className="text-destructive text-xs">{item.last_error}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.status === 'paused' && (
            <IconAction
              icon={Play}
              label="Resume"
              disabled={pending}
              onClick={() => resume.mutate(item.id)}
            />
          )}
          {isActive && (
            <IconAction
              icon={Pause}
              label="Pause"
              disabled={pending}
              onClick={() => pause.mutate(item.id)}
            />
          )}
          {!isClosed && (
            <IconAction
              icon={XCircle}
              label="Cancel"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (window.confirm('Cancel this schedule?')) cancel.mutate(item.id)
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ScheduledPage() {
  const device = useSelectedDevice()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ScheduleStatus | 'all'>('all')
  const query = useQuery({
    queryKey: ['schedules', device, status],
    queryFn: () => listSchedules(status === 'all' ? undefined : status),
    enabled: Boolean(device),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  })
  // Prefix key: an action changes the row's status, so every filtered view is stale.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['schedules', device] })

  if (!device) return <DeviceGuard />
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Scheduled"
        description="Delayed and recurring WhatsApp sends for the selected device."
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="flex-wrap"
            value={status}
            onValueChange={(value) => value && setStatus(value as ScheduleStatus | 'all')}
          >
            {STATUS_FILTERS.map((filter) => (
              <ToggleGroupItem key={filter.value} value={filter.value}>
                {filter.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      {query.error && (
        <Card className="border-destructive/50">
          <CardContent className="text-destructive py-4 text-sm">
            {toApiError(query.error).message}
          </CardContent>
        </Card>
      )}
      {query.isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {query.data?.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="No schedules"
          hint={
            status === 'all'
              ? 'Use Send later from a message form to create one.'
              : `Nothing with status "${status}". Pick another filter to widen the list.`
          }
        />
      )}
      {query.data && query.data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data.map((item) => (
            <ScheduleCard key={item.id} item={item} refresh={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
