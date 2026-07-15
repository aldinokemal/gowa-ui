import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { getUserAvatar } from '@/api/user'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid, useRecipientStore } from '@/stores/recipient'

export function AvatarForm() {
  const jid = useRecipientJid()
  const isGroup = useRecipientStore((state) => state.recipient.type === 'group')
  const [isPreview, setIsPreview] = useState(false)
  const [isCommunity, setIsCommunity] = useState(false)

  const mutation = useActionMutation(getUserAvatar, { successMessage: 'Avatar fetched' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({
      phone: jid,
      is_preview: isPreview,
      is_community: isGroup && isCommunity,
    })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={isPreview} onCheckedChange={setIsPreview} />
        Preview (smaller image)
      </label>
      {isGroup && (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isCommunity} onCheckedChange={setIsCommunity} />
          Community group
        </label>
      )}
      <Button type="submit" disabled={mutation.isPending || !jid} className="self-start">
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Fetch avatar
      </Button>
      {mutation.data?.url && (
        <img
          src={mutation.data.url}
          alt="Profile"
          className="max-h-64 self-start rounded-md border"
        />
      )}
    </form>
  )
}
