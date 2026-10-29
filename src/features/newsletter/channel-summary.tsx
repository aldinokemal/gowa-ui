import { useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { followNewsletter, type NewsletterMetadata } from '@/api/newsletter'
import { IdText } from '@/components/shared/id-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { formatDay } from '@/lib/format'
import { channelName, useFollowedNewsletters } from '@/features/newsletter/channel'

const countFormat = new Intl.NumberFormat(undefined, { notation: 'compact' })

export function ChannelSummary({ channel }: { channel: NewsletterMetadata }) {
  const meta = channel.thread_metadata
  const subscribers = Number(meta?.subscribers_count)
  const created = Number(meta?.creation_time)
  const details = [
    subscribers > 0 && `${countFormat.format(subscribers)} followers`,
    channel.viewer_metadata?.role,
    created > 0 && formatDay(new Date(created * 1000).toISOString()),
  ].filter(Boolean)
  const state = channel.state?.type

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 font-medium">
        <span className="truncate">{channelName(channel)}</span>
        {meta?.verification === 'verified' && (
          <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Verified" />
        )}
        {state && state !== 'active' && <Badge variant="destructive">{state}</Badge>}
      </p>
      <IdText value={channel.id.split('@')[0]} />
      {details.length > 0 && (
        <p className="text-muted-foreground truncate text-xs">{details.join(' · ')}</p>
      )}
    </div>
  )
}

export function FollowButton({ newsletterId }: { newsletterId: string }) {
  const queryClient = useQueryClient()
  const followed = useFollowedNewsletters()
  const follow = useActionMutation(followNewsletter, {
    successMessage: 'Following channel',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletters'] }),
  })

  if (followed.data?.data?.some((item) => item.id === newsletterId)) {
    return <Badge variant="secondary">Following</Badge>
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={follow.isPending}
      onClick={() => follow.mutate(newsletterId)}
    >
      {follow.isPending && <Loader2 className="size-4 animate-spin" />}
      Follow
    </Button>
  )
}
