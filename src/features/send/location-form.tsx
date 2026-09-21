import { useState, type FormEvent } from 'react'
import { locationRequest, sendLocation } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendLocationForm() {
  const jid = useRecipientJid()
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const { draft, patch, reset: resetSchedule } = useScheduleDraft()

  const mutation = useActionMutation(sendLocation, {
    successMessage: 'Location sent',
    onSuccess: () => {
      setLatitude('')
      setLongitude('')
      resetSchedule()
    },
  })

  const payload = {
    phone: jid,
    latitude,
    longitude,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location-latitude">Latitude</Label>
        <Input
          id="location-latitude"
          placeholder="-6.200000"
          value={latitude}
          onChange={(event) => setLatitude(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location-longitude">Longitude</Label>
        <Input
          id="location-longitude"
          placeholder="106.816666"
          value={longitude}
          onChange={(event) => setLongitude(event.target.value)}
          required
        />
      </div>
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send location"
        pending={mutation.isPending}
        disabled={!jid}
        request={locationRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
