import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  listLiveUpdates,
  subscribeLiveUpdates,
  unsubscribeLiveUpdates,
  type LiveUpdatesSubscription,
} from '@/api/newsletter'
import { IdText } from '@/components/shared/id-text'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useSelectedDevice } from '@/hooks/use-device-guard'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { usePrivateQuery } from '@/lib/private-query'
import { channelName, useFollowedNewsletters } from '@/features/newsletter/channel'

function useLiveUpdates() {
  const device = useSelectedDevice()
  return usePrivateQuery({
    queryKey: ['newsletter-live-updates', device],
    queryFn: listLiveUpdates,
    enabled: !!device,
    // GOWA renews each subscription about every 90 seconds
    refetchInterval: 30_000,
  })
}

function useStopLiveUpdates() {
  const queryClient = useQueryClient()
  return useActionMutation(unsubscribeLiveUpdates, {
    successMessage: 'Live updates stopped',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletter-live-updates'] }),
  })
}

export function LiveUpdatesSwitch({ newsletterId }: { newsletterId: string }) {
  const queryClient = useQueryClient()
  const live = useLiveUpdates()
  const stop = useStopLiveUpdates()
  const start = useActionMutation(subscribeLiveUpdates, {
    successMessage: 'Live updates on',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletter-live-updates'] }),
  })
  const active = live.data?.some((item) => item.newsletter_id === newsletterId) ?? false

  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch
        checked={active}
        disabled={live.isLoading || start.isPending || stop.isPending}
        onCheckedChange={(on) => (on ? start : stop).mutate(newsletterId)}
      />
      Live updates
    </label>
  )
}

export function LiveUpdatesList() {
  const live = useLiveUpdates()
  const followed = useFollowedNewsletters()

  if (live.isLoading) return <Skeleton className="h-16" />
  if (live.error)
    return <p className="text-destructive text-sm">{toApiError(live.error).message}</p>

  const items = live.data ?? []
  if (items.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        None running. Turn them on from a channel's messages; counter changes arrive as
        newsletter.message webhooks.
      </p>
    )

  const names = new Map(followed.data?.data?.map((item) => [item.id, channelName(item)]))

  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => (
        <LiveUpdateRow key={item.newsletter_id} item={item} name={names.get(item.newsletter_id)} />
      ))}
    </ul>
  )
}

function LiveUpdateRow({ item, name }: { item: LiveUpdatesSubscription; name?: string }) {
  const stop = useStopLiveUpdates()

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        {name && <p className="truncate font-medium">{name}</p>}
        <IdText value={item.newsletter_id.split('@')[0]} />
        <p className="text-muted-foreground text-xs">
          Renewed {formatDate(item.renewed_at)} · expires {formatDate(item.expires_at)}
        </p>
        {item.last_error && <p className="text-destructive text-xs">{item.last_error}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={stop.isPending}
        onClick={() => stop.mutate(item.newsletter_id)}
      >
        {stop.isPending && <Loader2 className="size-4 animate-spin" />}
        Stop
      </Button>
    </li>
  )
}
