import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { setGroupTopic } from '@/api/group'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActionMutation } from '@/hooks/use-action-mutation'

export function SetTopicForm({
  groupJid,
  initialTopic = '',
}: {
  groupJid: string
  initialTopic?: string
}) {
  const [topic, setTopic] = useState(initialTopic)

  const mutation = useActionMutation(setGroupTopic, { successMessage: 'Group topic updated' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({ group_id: groupJid, topic })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="set-topic-value">Topic (leave empty to clear)</Label>
        <Textarea
          id="set-topic-value"
          rows={3}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Update topic
      </Button>
      <ResultPanel result={mutation.data} />
    </form>
  )
}
