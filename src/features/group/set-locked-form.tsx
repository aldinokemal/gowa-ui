import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { setGroupLocked } from '@/api/group'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useActionMutation } from '@/hooks/use-action-mutation'

export function SetLockedForm({
  groupJid,
  initialLocked = false,
}: {
  groupJid: string
  initialLocked?: boolean
}) {
  const [locked, setLocked] = useState(initialLocked)

  const mutation = useActionMutation(setGroupLocked, { successMessage: 'Group lock updated' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({ group_id: groupJid, locked })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={locked} onCheckedChange={setLocked} />
        Locked (only admins can edit group info)
      </label>
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Update lock
      </Button>
      <ResultPanel result={mutation.data} />
    </form>
  )
}
