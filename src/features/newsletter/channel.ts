import type { NewsletterMetadata } from '@/api/newsletter'
import { listNewsletters } from '@/api/user'
import { useSelectedDevice } from '@/hooks/use-device-guard'
import { usePrivateQuery } from '@/lib/private-query'

export function channelName(channel: NewsletterMetadata): string {
  return channel.thread_metadata?.name?.text || channel.id.split('@')[0]
}

/** Channels the selected device follows; also decides Follow vs Following. */
export function useFollowedNewsletters() {
  const device = useSelectedDevice()
  return usePrivateQuery({
    queryKey: ['newsletters', device],
    queryFn: listNewsletters,
    enabled: !!device,
  })
}
