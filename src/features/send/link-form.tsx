import { useState, type FormEvent } from 'react'
import { linkRequest, sendLink } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendLinkForm() {
  const jid = useRecipientJid()
  const [link, setLink] = useState('')
  const [caption, setCaption] = useState('')
  const { draft, patch, reset: resetSchedule } = useScheduleDraft()

  const mutation = useActionMutation(sendLink, {
    successMessage: (r) => (r.schedule_id ? r.status : 'Link sent'),
    onSuccess: () => {
      setLink('')
      setCaption('')
      resetSchedule()
    },
  })

  const payload = {
    phone: jid,
    link,
    caption,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url">Link</Label>
        <Input
          id="link-url"
          placeholder="https://example.com"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-caption">Caption</Label>
        <Input
          id="link-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send link"
        pending={mutation.isPending}
        disabled={!jid}
        request={linkRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
