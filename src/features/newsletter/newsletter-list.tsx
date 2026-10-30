import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, MessageSquareText } from 'lucide-react'
import { unfollowNewsletter, type NewsletterMetadata } from '@/api/newsletter'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { toApiError } from '@/lib/api-error'
import { ChannelMessagesSheet } from '@/features/newsletter/channel-messages-sheet'
import { useFollowedNewsletters } from '@/features/newsletter/channel'
import { ChannelSummary } from '@/features/newsletter/channel-summary'

export function NewsletterList() {
  const { data, isLoading, error } = useFollowedNewsletters()
  const [openChannel, setOpenChannel] = useState<NewsletterMetadata | null>(null)

  if (isLoading) return <Skeleton className="h-24" />
  if (error) return <p className="text-destructive text-sm">{toApiError(error).message}</p>

  const items = data?.data ?? []
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">No newsletters followed.</p>

  return (
    <>
      <ul className="flex flex-col divide-y">
        {items.map((item) => (
          <FollowedChannel key={item.id} channel={item} onOpen={() => setOpenChannel(item)} />
        ))}
      </ul>
      <ChannelMessagesSheet
        channel={openChannel}
        onOpenChange={(open) => !open && setOpenChannel(null)}
      />
    </>
  )
}

function FollowedChannel({ channel, onOpen }: { channel: NewsletterMetadata; onOpen: () => void }) {
  const queryClient = useQueryClient()
  const unfollow = useActionMutation(unfollowNewsletter, {
    successMessage: 'Unfollowed newsletter',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsletters'] }),
  })

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <ChannelSummary channel={channel} />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpen}>
          <MessageSquareText className="size-4" />
          Messages
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={unfollow.isPending}
          onClick={() => unfollow.mutate(channel.id)}
        >
          {unfollow.isPending && <Loader2 className="size-4 animate-spin" />}
          Unfollow
        </Button>
      </div>
    </li>
  )
}
