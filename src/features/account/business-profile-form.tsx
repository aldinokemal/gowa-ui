import { type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { getBusinessProfile, type BusinessProfileResponse } from '@/api/user'
import { Button } from '@/components/ui/button'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'

export function BusinessProfileForm() {
  const jid = useRecipientJid()
  const mutation = useActionMutation(getBusinessProfile, {
    successMessage: 'Business profile fetched',
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(jid)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <p className="text-muted-foreground text-sm">
        Works only with WhatsApp Business accounts that have a public profile.
      </p>
      <Button type="submit" disabled={mutation.isPending || !jid} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Get business profile
      </Button>
      {mutation.data && <BusinessProfileResult data={mutation.data} />}
    </form>
  )
}

function BusinessProfileResult({ data }: { data: BusinessProfileResponse }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <Row label="JID" value={data.jid} />
      {data.email && <Row label="Email" value={data.email} />}
      {data.address && <Row label="Address" value={data.address} />}
      {data.business_hours_timezone && (
        <Row label="Timezone" value={data.business_hours_timezone} />
      )}
      {data.categories && data.categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Categories</span>
          <span className="font-mono">{data.categories.map((c) => c.name).join(', ')}</span>
        </div>
      )}
      {data.business_hours && data.business_hours.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Business hours</span>
          <ul className="font-mono">
            {data.business_hours.map((h) => (
              <li key={h.day_of_week}>
                {h.day_of_week}: {h.open_time || '—'} - {h.close_time || '—'} ({h.mode})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono break-all">{value}</span>
    </div>
  )
}
