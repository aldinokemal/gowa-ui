import { useState, type FormEvent } from 'react'
import { fileRequest, sendFile } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { FileOrUrlInput, type FileOrUrl } from '@/components/shared/file-or-url-input'
import { ResultPanel } from '@/components/shared/result-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export function SendFileForm() {
  const jid = useRecipientJid()
  const [source, setSource] = useState<FileOrUrl>({ url: '' })
  const [caption, setCaption] = useState('')
  const { draft, patch } = useScheduleDraft()

  const mutation = useActionMutation(sendFile, { successMessage: 'File sent' })

  const payload = {
    phone: jid,
    file: source.file,
    fileUrl: source.url || undefined,
    caption,
    ...draft,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FileOrUrlInput label="File" value={source} onChange={setSource} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="file-caption">Caption</Label>
        <Input
          id="file-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>
      <ScheduleFields draft={draft} patch={patch} />
      <FormActions
        submitLabel="Send file"
        pending={mutation.isPending}
        disabled={!jid}
        request={fileRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
