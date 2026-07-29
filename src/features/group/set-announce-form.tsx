import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { setGroupAnnounce } from '@/api/group'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useActionMutation } from '@/hooks/use-action-mutation'

export function SetAnnounceForm({
  groupJid,
  initialAnnounce = false,
}: {
  groupJid: string
  initialAnnounce?: boolean
}) {
  const [announce, setAnnounce] = useState(initialAnnounce)

  const mutation = useActionMutation(setGroupAnnounce, { successMessage: 'Announce mode updated' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({ group_id: groupJid, announce })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={announce} onCheckedChange={setAnnounce} />
        Announce mode (only admins can send messages)
      </label>
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Update announce
      </Button>
      <ResultPanel result={mutation.data} />
    </form>
  )
}
