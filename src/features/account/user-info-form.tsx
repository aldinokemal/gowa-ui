import { type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { getUserInfo, type UserInfoResponse } from '@/api/user'
import { Button } from '@/components/ui/button'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'

export function UserInfoForm() {
  const jid = useRecipientJid()
  const mutation = useActionMutation(getUserInfo, { successMessage: 'User info fetched' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(jid)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Button type="submit" disabled={mutation.isPending || !jid} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Search
      </Button>
      {mutation.data && <UserInfoResult data={mutation.data} />}
    </form>
  )
}

function UserInfoResult({ data }: { data: UserInfoResponse }) {
  const user = data.data[0]
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      {data.resolved_phone && <Row label="Resolved phone" value={data.resolved_phone} />}
      {data.resolved_lid && <Row label="Resolved LID" value={data.resolved_lid} />}
      {user?.verified_name && <Row label="Verified name" value={user.verified_name} />}
      {user?.name && <Row label="Name" value={user.name} />}
      {user?.status && <Row label="Status" value={user.status} />}
      {user && <Row label="Devices" value={String(user.devices?.length ?? 0)} />}
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
