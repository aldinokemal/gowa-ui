import { type FormEvent } from 'react'
import { subscribePresence, subscribePresenceRequest } from '@/api/user'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'

export function SubscribePresenceForm() {
  const jid = useRecipientJid()
  const mutation = useActionMutation(subscribePresence, {
    successMessage: 'Subscribed to presence',
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(jid)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <p className="text-muted-foreground text-sm">
        Subscribe this device to the contact&apos;s online/offline updates. They arrive as{' '}
        <code className="font-mono text-xs">presence</code> webhooks, and only while this device is
        marked available.
      </p>
      <FormActions
        submitLabel="Subscribe"
        pending={mutation.isPending}
        disabled={!jid}
        request={subscribePresenceRequest(jid)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
