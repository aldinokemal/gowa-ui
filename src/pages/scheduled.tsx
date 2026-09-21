import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pause, Play, XCircle } from 'lucide-react'
import { listSchedules, pauseSchedule, resumeSchedule, cancelSchedule, type ScheduledSend } from '@/api/schedule'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

function statusVariant(status: ScheduledSend['status']) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'completed' || status === 'active' || status === 'running') return 'default' as const
  return 'secondary' as const
}

function ScheduleCard({ item, refresh }: { item: ScheduledSend; refresh: () => void }) {
  const pause = useActionMutation(pauseSchedule, { successMessage: 'Schedule paused', onSuccess: refresh })
  const resume = useActionMutation(resumeSchedule, { successMessage: 'Schedule resumed', onSuccess: refresh })
  const cancel = useActionMutation(cancelSchedule, { successMessage: 'Schedule cancelled', onSuccess: refresh })
  const pending = pause.isPending || resume.isPending || cancel.isPending
  const isActive = item.status === 'active' || item.status === 'running'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base capitalize">{item.message_type} to {item.phone}</CardTitle>
          <p className="text-muted-foreground mt-1 truncate text-sm">{item.summary || 'Scheduled message'}</p>
        </div>
        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div><span className="text-muted-foreground">Next run</span><br />{item.next_run_at ? formatDate(item.next_run_at) : '—'}</div>
          <div><span className="text-muted-foreground">Recurrence</span><br />{item.recurrence}{item.timezone ? ` · ${item.timezone}` : ''}</div>
          <div><span className="text-muted-foreground">Runs</span><br />{item.occurrence_count}{item.occurrence_limit ? ` / ${item.occurrence_limit}` : ''}</div>
          <div><span className="text-muted-foreground">Attempts</span><br />{item.attempts}</div>
        </div>
        {item.last_error && <p className="text-destructive text-xs">{item.last_error}</p>}
        <div className="flex flex-wrap gap-2">
          {item.status === 'paused' && <Button size="sm" variant="outline" disabled={pending} onClick={() => resume.mutate(item.id)}><Play className="size-4" />Resume</Button>}
          {isActive && <Button size="sm" variant="outline" disabled={pending} onClick={() => pause.mutate(item.id)}><Pause className="size-4" />Pause</Button>}
          {!['completed', 'cancelled'].includes(item.status) && <Button size="sm" variant="destructive" disabled={pending} onClick={() => { if (window.confirm('Cancel this schedule?')) cancel.mutate(item.id) }}><XCircle className="size-4" />Cancel</Button>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ScheduledPage() {
  const device = useSelectedDevice()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['schedules', device],
    queryFn: () => listSchedules(),
    enabled: Boolean(device),
    refetchInterval: 10_000,
  })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['schedules', device] })

  if (!device) return <DeviceGuard />
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Scheduled" description="Delayed and recurring WhatsApp sends for the selected device." />
      {query.error && <Card className="border-destructive/50"><CardContent className="text-destructive py-4 text-sm">{toApiError(query.error).message}</CardContent></Card>}
      {query.isLoading && <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>}
      {query.data?.length === 0 && <EmptyState icon={Play} title="No schedules" hint="Use Send later from a message form to create one." />}
      {query.data && query.data.length > 0 && <div className="grid gap-4 md:grid-cols-2">{query.data.map((item) => <ScheduleCard key={item.id} item={item} refresh={refresh} />)}</div>}
    </div>
  )
}
