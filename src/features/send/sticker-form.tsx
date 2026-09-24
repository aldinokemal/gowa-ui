import { useState, type FormEvent } from 'react'
import { stickerRequest, sendSticker } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { FileOrUrlInput, type FileOrUrl } from '@/components/shared/file-or-url-input'
import { ResultPanel } from '@/components/shared/result-panel'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendStickerForm() {
  const jid = useRecipientJid()
  const [source, setSource] = useState<FileOrUrl>({ url: '' })
  const { draft, patch, reset: resetSchedule } = useScheduleDraft()

  const mutation = useActionMutation(sendSticker, {
    successMessage: (r) => (r.schedule_id ? r.status : 'Sticker sent'),
    onSuccess: () => {
      setSource({ url: '' })
      resetSchedule()
    },
  })

  const payload = {
    phone: jid,
    file: source.file,
    fileUrl: source.url || undefined,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FileOrUrlInput label="Sticker" accept="image/*" value={source} onChange={setSource} />
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send sticker"
        pending={mutation.isPending}
        disabled={!jid}
        request={stickerRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
