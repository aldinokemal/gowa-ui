import { useState, type FormEvent } from 'react'
import { sendVideo, videoRequest, type MediaQuality } from '@/api/send'
import { FormActions } from '@/components/shared/curl-dialog'
import { FileOrUrlInput, type FileOrUrl } from '@/components/shared/file-or-url-input'
import { ResultPanel } from '@/components/shared/result-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MediaQualityField } from '@/features/send/media-quality-field'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'

export function SendVideoForm() {
  const jid = useRecipientJid()
  const [source, setSource] = useState<FileOrUrl>({ url: '' })
  const [caption, setCaption] = useState('')
  const [viewOnce, setViewOnce] = useState(false)
  const [quality, setQuality] = useState<MediaQuality>('standard')
  const [gifPlayback, setGifPlayback] = useState(false)

  const mutation = useActionMutation(sendVideo, { successMessage: 'Video sent' })

  const payload = {
    phone: jid,
    file: source.file,
    fileUrl: source.url || undefined,
    caption,
    view_once: viewOnce,
    quality,
    gif_playback: gifPlayback,
    // view_once messages cannot be forwarded per the WhatsApp protocol
    is_forwarded: viewOnce ? false : undefined,
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(payload)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <FileOrUrlInput label="Video" accept="video/*" value={source} onChange={setSource} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="video-caption">Caption</Label>
        <Input
          id="video-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={viewOnce} onCheckedChange={setViewOnce} />
        View once
      </label>
      <MediaQualityField value={quality} onChange={setQuality} />
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={gifPlayback} onCheckedChange={setGifPlayback} />
        GIF playback
      </label>
      <FormActions
        submitLabel="Send video"
        pending={mutation.isPending}
        disabled={!jid}
        request={videoRequest(payload)}
      />
      <ResultPanel result={mutation.data} />
    </form>
  )
}
