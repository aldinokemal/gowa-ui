import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { unfollowNewsletter } from '@/api/newsletter'
import { listNewsletters } from '@/api/user'
import { IdText } from '@/components/shared/id-text'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useSelectedDevice } from '@/hooks/use-device-guard'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

export function NewsletterList() {
  const device = useSelectedDevice()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['newsletters', device],
    queryFn: listNewsletters,
    enabled: !!device,
  })

  const unfollow = useActionMutation(unfollowNewsletter, {
    successMessage: 'Unfollowed newsletter',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletters'] }),
  })

  if (isLoading) return <Skeleton className="h-24" />
  if (error) return <p className="text-destructive text-sm">{toApiError(error).message}</p>

  const items = data?.data ?? []
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">No newsletters followed.</p>

  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {item.thread_metadata?.name?.text || item.id.split('@')[0]}
            </p>
            <IdText value={item.id.split('@')[0]} />
            <p className="text-muted-foreground truncate text-xs">
              {item.viewer_metadata?.role ?? 'guest'}
              {' · '}
              {formatCreation(item.thread_metadata?.creation_time)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={unfollow.isPending}
            onClick={() => unfollow.mutate(item.id)}
          >
            {unfollow.isPending && <Loader2 className="size-4 animate-spin" />}
            Unfollow
          </Button>
        </li>
      ))}
    </ul>
  )
}

function formatCreation(unix?: string): string {
  const seconds = Number(unix)
  if (!seconds) return ''
  return formatDate(new Date(seconds * 1000).toISOString())
}
