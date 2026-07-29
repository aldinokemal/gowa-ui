import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { setGroupName } from '@/api/group'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'

export function SetNameForm({
  groupJid,
  initialName = '',
}: {
  groupJid: string
  initialName?: string
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(initialName)

  const mutation = useActionMutation(setGroupName, {
    successMessage: 'Group name updated',
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({ group_id: groupJid, name })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="set-name-value">New name</Label>
        <Input
          id="set-name-value"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Update name
      </Button>
      <ResultPanel result={mutation.data} />
    </form>
  )
}
