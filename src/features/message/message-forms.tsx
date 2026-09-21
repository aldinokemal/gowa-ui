import { useState, type FormEvent, type ReactNode } from 'react'
import {
  deleteRequest,
  forwardRequest,
  reactRequest,
  readRequest,
  revokeRequest,
  starRequest,
  unstarRequest,
  updateRequest,
} from '@/api/message'
import { exec, type ApiRequest } from '@/api/request'
import { FormActions } from '@/components/shared/curl-dialog'
import { ResultPanel } from '@/components/shared/result-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActionMutation } from '@/hooks/use-action-mutation'
import { useRecipientJid } from '@/stores/recipient'
import type { SendResult } from '@/api/send'
import { ScheduleFields } from '@/features/send/schedule-fields'
import { useScheduleDraft } from '@/features/send/use-schedule-draft'

export interface MessageActionProps {
  messageId: string
}

/** Shared shell: submit + cURL + result. Recipient and message ID come from the workspace. */
function MessageActionForm({
  messageId,
  submitLabel,
  successMessage,
  request,
  children,
  extraValid = true,
}: MessageActionProps & {
  submitLabel: string
  successMessage: string
  request: (messageId: string, phone: string) => ApiRequest
  children?: ReactNode
  extraValid?: boolean
}) {
  const jid = useRecipientJid()
  const mutation = useActionMutation((vars: { messageId: string; phone: string }) =>
    exec<SendResult>(request(vars.messageId, vars.phone)),
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({ messageId: messageId.trim(), phone: jid })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {children}
      <FormActions
        submitLabel={submitLabel}
        pending={mutation.isPending}
        disabled={!messageId.trim() || !jid || !extraValid}
        request={request(messageId.trim(), jid)}
      />
      {mutation.isSuccess && <ResultPanel result={{ status: successMessage }} />}
    </form>
  )
}

export function ReactForm({ messageId }: MessageActionProps) {
  const [emoji, setEmoji] = useState('')
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel="Send reaction"
      successMessage="Reaction sent"
      extraValid={emoji.trim().length > 0}
      request={(id, phone) => reactRequest(id, { phone, emoji })}
    >
      <div className="flex flex-col gap-2">
        <Label>Emoji</Label>
        <Input
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
          placeholder="👍 (empty removes the reaction)"
        />
      </div>
    </MessageActionForm>
  )
}

export function UpdateForm({ messageId }: MessageActionProps) {
  const [message, setMessage] = useState('')
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel="Update message"
      successMessage="Message updated"
      extraValid={message.trim().length > 0}
      request={(id, phone) => updateRequest(id, { phone, message })}
    >
      <div className="flex flex-col gap-2">
        <Label>New text</Label>
        <Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
    </MessageActionForm>
  )
}

export function DeleteForm({ messageId }: MessageActionProps) {
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel="Delete for everyone"
      successMessage="Message deleted"
      request={(id, phone) => deleteRequest(id, { phone })}
    />
  )
}

export function RevokeForm({ messageId }: MessageActionProps) {
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel="Revoke message"
      successMessage="Message revoked"
      request={(id, phone) => revokeRequest(id, { phone })}
    />
  )
}

export function ReadForm({ messageId }: MessageActionProps) {
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel="Mark as read"
      successMessage="Marked as read"
      request={(id, phone) => readRequest(id, { phone })}
    />
  )
}

export function StarForm({ messageId }: MessageActionProps) {
  const [starred, setStarred] = useState(true)
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel={starred ? 'Star message' : 'Unstar message'}
      successMessage={starred ? 'Message starred' : 'Message unstarred'}
      request={(id, phone) => (starred ? starRequest(id, { phone }) : unstarRequest(id, { phone }))}
    >
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={starred ? 'default' : 'outline'}
          onClick={() => setStarred(true)}
        >
          Star
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!starred ? 'default' : 'outline'}
          onClick={() => setStarred(false)}
        >
          Unstar
        </Button>
      </div>
    </MessageActionForm>
  )
}

export function ForwardForm({ messageId }: MessageActionProps) {
  const [reupload, setReupload] = useState(false)
  const { draft, patch } = useScheduleDraft()
  return (
    <MessageActionForm
      messageId={messageId}
      submitLabel="Forward message"
      successMessage="Message forwarded"
      request={(id, phone) => forwardRequest(id, { phone, force_reupload: reupload, ...draft })}
    >
      <label className="text-muted-foreground flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={reupload}
          onChange={(event) => setReupload(event.target.checked)}
        />
        Force re-upload media
      </label>
      <ScheduleFields draft={draft} patch={patch} />
    </MessageActionForm>
  )
}
