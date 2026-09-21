import { useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { pollRequest, sendPoll } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendPollForm() {
  const jid = useRecipientJid()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [maxAnswer, setMaxAnswer] = useState(1)
  const { draft, patch } = useScheduleDraft()

  const mutation = useActionMutation(sendPoll, { successMessage: 'Poll sent' })

  const setOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((option, i) => (i === index ? value : option)))
  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (index: number) => setOptions((prev) => prev.filter((_, i) => i !== index))

  const payload = {
    phone: jid,
    question,
    options: options.map((option) => option.trim()).filter(Boolean),
    max_answer: maxAnswer,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="poll-question">Question</Label>
        <Input
          id="poll-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Options</Label>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(event) => setOption(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
            >
              <X />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={addOption}
        >
          <Plus />
          Add option
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="poll-max-answer">Max answers</Label>
        <Input
          id="poll-max-answer"
          type="number"
          min={1}
          value={maxAnswer}
          onChange={(event) => setMaxAnswer(Number(event.target.value))}
        />
      </div>
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send poll"
        pending={mutation.isPending}
        disabled={!jid}
        request={pollRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
