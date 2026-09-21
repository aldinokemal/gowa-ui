import { useState, type ComponentType } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Search,
  XCircle,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 25

const STATUS_FILTERS: { value: ScheduleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

// The eleven kinds a scheduled send can be, in the order the compose forms
// present them.
const MESSAGE_TYPES: { value: string; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'file', label: 'File' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'contact', label: 'Contact' },
  { value: 'link', label: 'Link' },
  { value: 'location', label: 'Location' },
  { value: 'poll', label: 'Poll' },
  { value: 'forward', label: 'Forward' },
]

type ScheduleAction = 'pause' | 'resume' | 'cancel'

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

function ScheduleRow({
  item,
  busy,
  run,
}: {
  item: ScheduledSend
  busy: boolean
  run: (action: ScheduleAction, id: string) => void
}) {
  const isActive = item.status === 'active' || item.status === 'running'
  const isClosed = item.status === 'completed' || item.status === 'cancelled'

  return (
    <TableRow>
      <TableCell className="max-w-[16rem] font-medium">
        <div className="truncate" title={item.phone}>
          <span className="text-muted-foreground capitalize">{item.message_type}</span> ·{' '}
          {item.phone}
        </div>
      </TableCell>
      <TableCell className="max-w-[18rem]">
        <div className="truncate">{item.summary || 'Scheduled message'}</div>
        {item.last_error && (
          <div className="text-destructive truncate text-xs" title={item.last_error}>
            {item.last_error}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground hidden sm:table-cell">
        {item.next_run_at ? formatDate(item.next_run_at) : 'No next run'}
      </TableCell>
      <TableCell className="text-muted-foreground hidden lg:table-cell">
        <div>{item.recurrence}</div>
        {item.timezone && <div className="text-xs">{item.timezone}</div>}
      </TableCell>
      <TableCell className="text-muted-foreground hidden md:table-cell">
        <div>
          {item.occurrence_count}
          {item.occurrence_limit ? `/${item.occurrence_limit}` : ''}
        </div>
        {/* Attempts only earn a slot once a run has actually failed. */}
        {item.attempts > 0 && <div className="text-xs">{item.attempts} attempts</div>}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {item.status === 'paused' && (
            <IconAction
              icon={Play}
              label="Resume"
              disabled={busy}
              onClick={() => run('resume', item.id)}
            />
          )}
          {isActive && (
            <IconAction
              icon={Pause}
              label="Pause"
              disabled={busy}
              onClick={() => run('pause', item.id)}
            />
          )}
          {!isClosed && (
            <IconAction
              icon={XCircle}
              label="Cancel"
              variant="destructive"
              disabled={busy}
              onClick={() => run('cancel', item.id)}
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function ScheduleTable({ device }: { device: string }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ScheduleStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [messageType, setMessageType] = useState('all')
  const [offset, setOffset] = useState(0)
  const query = useQuery({
    queryKey: ['schedules', device, status, search, messageType, offset],
    queryFn: () =>
      listSchedules({
        status: status === 'all' ? undefined : status,
        search: search || undefined,
        message_type: messageType === 'all' ? undefined : messageType,
        limit: PAGE_SIZE,
        offset,
      }),
    enabled: Boolean(device),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  })
  // Prefix key: an action changes the row's status, so every filtered view is stale.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['schedules', device] })

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

  // The three mutations live here rather than per row, so the hook count stays
  // flat as the page fills. Rows read back the id in flight to disable only
  // themselves instead of the whole table.
  const pendingId = pause.isPending
    ? pause.variables
    : resume.isPending
      ? resume.variables
      : cancel.isPending
        ? cancel.variables
        : undefined

  const run = (action: ScheduleAction, id: string) => {
    if (action === 'pause') pause.mutate(id)
    else if (action === 'resume') resume.mutate(id)
    else if (window.confirm('Cancel this schedule?')) cancel.mutate(id)
  }

  const rows = query.data?.data ?? []
  const total = query.data?.pagination.total ?? 0

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
            onValueChange={(value) => {
              if (!value) return
              setStatus(value as ScheduleStatus | 'all')
              setOffset(0)
            }}
          >
            {STATUS_FILTERS.map((filter) => (
              <ToggleGroupItem key={filter.value} value={filter.value}>
                {filter.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            className="pl-8"
            placeholder="Search recipient or message"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setOffset(0)
            }}
          />
        </div>
        <Select
          value={messageType}
          onValueChange={(value) => {
            setMessageType(value)
            setOffset(0)
          }}
        >
          <SelectTrigger className="w-44" aria-label="Message type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MESSAGE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.error && (
        <Card className="border-destructive/50">
          <CardContent className="text-destructive py-4 text-sm">
            {toApiError(query.error).message}
          </CardContent>
        </Card>
      )}
      {query.isLoading && (
        <div className="flex flex-col gap-2 rounded-lg border p-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9" />
          ))}
        </div>
      )}
      {query.data && rows.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="No schedules"
          hint={
            status === 'all' && messageType === 'all' && !search
              ? 'Use Send later from a message form to create one.'
              : 'Nothing matches these filters. Widen the search, status, or type.'
          }
        />
      )}
      {rows.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Next run</TableHead>
                <TableHead className="hidden lg:table-cell">Repeats</TableHead>
                <TableHead className="hidden md:table-cell">Sent</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <ScheduleRow key={item.id} item={item} busy={pendingId === item.id} run={run} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            {offset + 1}–{offset + rows.length} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft data-icon="inline-start" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScheduledPage() {
  const device = useSelectedDevice()
  if (!device) return <DeviceGuard />
  // Remount on device switch so the filter and page reset with the data.
  return <ScheduleTable key={device} device={device} />
}
