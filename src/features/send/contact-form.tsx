import { useState, type FormEvent } from 'react'
import { contactRequest, sendContact } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendContactForm() {
  const jid = useRecipientJid()
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const { draft, patch, reset: resetSchedule } = useScheduleDraft()

  const mutation = useActionMutation(sendContact, {
    successMessage: 'Contact sent',
    onSuccess: () => {
      setContactName('')
      setContactPhone('')
      resetSchedule()
    },
  })

  const payload = {
    phone: jid,
    contact_name: contactName,
    contact_phone: contactPhone,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-name">Contact name</Label>
        <Input
          id="contact-name"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-phone">Contact phone</Label>
        <Input
          id="contact-phone"
          placeholder="628xxxxxxxxxx"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          required
        />
      </div>
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send contact"
        pending={mutation.isPending}
        disabled={!jid}
        request={contactRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
