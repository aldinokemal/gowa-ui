import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { getNewsletterInfo } from '@/api/newsletter'
import { IdText } from '@/components/shared/id-text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { ChannelSummary, FollowButton } from '@/features/newsletter/channel-summary'

export function ChannelLookupForm() {
  const [value, setValue] = useState('')
  const lookup = useActionMutation(getNewsletterInfo, { successMessage: 'Channel found' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const input = value.trim()
    // A bare numeric id is a newsletter JID without its server; anything else is an invite.
    const id = /^\d+(@newsletter)?$/.test(input) ? input.replace(/@newsletter$/, '') : ''
    lookup.mutate(id ? { newsletter_id: `${id}@newsletter` } : { invite: input })
  }

  const channel = lookup.data
  const description = channel?.thread_metadata?.description?.text
  const invite = channel?.thread_metadata?.invite

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="channel-lookup">Newsletter ID or invite link</Label>
        <Input
          id="channel-lookup"
          placeholder="120363024512399999@newsletter or https://whatsapp.com/channel/..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
      </div>
      <Button type="submit" className="self-start" disabled={lookup.isPending}>
        {lookup.isPending && <Loader2 className="size-4 animate-spin" />}
        Look up
      </Button>
      {channel && (
        <div className="animate-in fade-in flex flex-col gap-3 rounded-lg border p-3 duration-300">
          <div className="flex items-start justify-between gap-3">
            <ChannelSummary channel={channel} />
            <FollowButton newsletterId={channel.id} />
          </div>
          {description && <p className="text-sm break-words whitespace-pre-wrap">{description}</p>}
          {invite && <IdText value={`https://whatsapp.com/channel/${invite}`} />}
        </div>
      )}
    </form>
  )
}
