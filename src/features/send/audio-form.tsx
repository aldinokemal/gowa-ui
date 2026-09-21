import { useState, type FormEvent } from 'react'
import { audioRequest, sendAudio } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { FileOrUrlInput, type FileOrUrl } from '@/components/shared/file-or-url-input'
import { ResultPanel } from '@/components/shared/result-panel'
import { Switch } from '@/components/ui/switch'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendAudioForm() {
  const jid = useRecipientJid()
  const [source, setSource] = useState<FileOrUrl>({ url: '' })
  const [ptt, setPtt] = useState(false)
  const { draft, patch, reset: resetSchedule } = useScheduleDraft()

  const mutation = useActionMutation(sendAudio, {
    successMessage: 'Audio sent',
    onSuccess: () => {
      setSource({ url: '' })
      setPtt(false)
      resetSchedule()
    },
  })

  const payload = {
    phone: jid,
    file: source.file,
    fileUrl: source.url || undefined,
    ptt,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FileOrUrlInput label="Audio" accept="audio/*" value={source} onChange={setSource} />
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={ptt} onCheckedChange={setPtt} />
        Send as voice note (PTT)
      </label>
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send audio"
        pending={mutation.isPending}
        disabled={!jid}
        request={audioRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
