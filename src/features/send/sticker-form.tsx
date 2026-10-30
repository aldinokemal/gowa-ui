import { useState, type FormEvent } from 'react'
import { stickerRequest, sendSticker } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { FileOrUrlInput, type FileOrUrl } from '@/components/shared/file-or-url-input'
import { ResultPanel } from '@/components/shared/result-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendStickerForm() {
  const jid = useRecipientJid()
  const [source, setSource] = useState<FileOrUrl>({ url: '' })
  const [replyId, setReplyId] = useState('')
  const { draft, patch, reset: resetSchedule } = useScheduleDraft()

  const mutation = useActionMutation(sendSticker, {
    successMessage: (r) => (r.schedule_id ? r.status : 'Sticker sent'),
    onSuccess: () => {
      setSource({ url: '' })
      setReplyId('')
      resetSchedule()
    },
  })

  const payload = {
    phone: jid,
    file: source.file,
    fileUrl: source.url || undefined,
    reply_message_id: replyId || undefined,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FileOrUrlInput label="Sticker" accept="image/*" value={source} onChange={setSource} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="sticker-reply">Reply to message ID (optional)</Label>
        <Input
          id="sticker-reply"
          value={replyId}
          onChange={(event) => setReplyId(event.target.value)}
        />
      </div>
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
