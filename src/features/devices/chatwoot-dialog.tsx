import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteChatwootConfig,
  getChatwootConfig,
  saveChatwootConfig,
  type ChatwootConfig,
} from '@/api/chatwoot'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAppInfo } from '@/hooks/use-app-info'
import { toApiError } from '@/lib/api-error'
import { scopedQueryKey, usePrivateQuery } from '@/lib/private-query'
import { rerootServerUrl, sameOriginBaseUrl } from '@/lib/url'
import { useConnection } from '@/stores/connection'
import type { RegistryDevice } from '@/api/types'

export function DeviceChatwootDialog({
  device,
  open,
  onOpenChange,
}: {
  device: RegistryDevice
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const connectionId = useConnection((state) => state.connectionId)
  const queryKey = ['device-chatwoot', device.id]
  const [url, setUrl] = useState('')
  const [accountId, setAccountId] = useState('')
  const [inboxId, setInboxId] = useState('')
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [removeSecret, setRemoveSecret] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const config = usePrivateQuery({
    queryKey,
    queryFn: () => getChatwootConfig(device.id),
    enabled: open,
  })
  const existing = config.data ?? null

  useEffect(() => {
    if (config.data === undefined) return
    setUrl(config.data?.chatwoot_url ?? '')
    setAccountId(config.data ? String(config.data.account_id) : '')
    setInboxId(config.data ? String(config.data.inbox_id) : '')
    setEnabled(config.data?.enabled ?? true)
    setToken('')
    setSecret('')
    setRemoveSecret(false)
  }, [config.data])

  const save = useMutation({
    mutationFn: () =>
      saveChatwootConfig(device.id, {
        chatwoot_url: url.trim(),
        account_id: Number(accountId),
        inbox_id: Number(inboxId),
        api_token: token.trim() || undefined,
        enabled,
        webhook_secret: removeSecret ? '' : secret.trim() || undefined,
      }),
    onSuccess: (saved) => {
      toast.success(`Chatwoot config saved for ${device.id}`)
      queryClient.setQueryData(scopedQueryKey(queryKey, connectionId), saved)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const remove = useMutation({
    mutationFn: () => deleteChatwootConfig(device.id),
    onSuccess: () => {
      toast.success(`Chatwoot config removed for ${device.id}`)
      queryClient.setQueryData(scopedQueryKey(queryKey, connectionId), null)
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chatwoot for {device.display_name || device.id}</DialogTitle>
          <DialogDescription>
            Route this device&apos;s chats to its own Chatwoot inbox. Once any device has a config,
            devices without one are skipped.
          </DialogDescription>
        </DialogHeader>
        {config.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : config.error ? (
          <p className="text-destructive text-sm">{toApiError(config.error).message}</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            {existing && <WebhookUrl config={existing} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="chatwoot-url">Chatwoot URL</Label>
              <Input
                id="chatwoot-url"
                placeholder="https://app.chatwoot.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="chatwoot-account">Account ID</Label>
                <Input
                  id="chatwoot-account"
                  type="number"
                  min={1}
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="chatwoot-inbox">Inbox ID</Label>
                <Input
                  id="chatwoot-inbox"
                  type="number"
                  min={1}
                  value={inboxId}
                  onChange={(event) => setInboxId(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="chatwoot-token">API token</Label>
              <Input
                id="chatwoot-token"
                type="password"
                autoComplete="off"
                placeholder={
                  existing ? `stored (${existing.api_token}) — leave blank to keep` : undefined
                }
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required={!existing}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="chatwoot-secret">Webhook secret (optional)</Label>
                {removeSecret ? (
                  <Badge variant="destructive">Removed on save</Badge>
                ) : (
                  <Badge variant={existing?.webhook_secret_set ? 'secondary' : 'outline'}>
                    {existing?.webhook_secret_set ? 'Set' : 'Not set'}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="chatwoot-secret"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    existing?.webhook_secret_set
                      ? 'leave blank to keep the stored secret'
                      : "the inbox API channel's secret"
                  }
                  value={secret}
                  disabled={removeSecret}
                  onChange={(event) => setSecret(event.target.value)}
                />
                {existing?.webhook_secret_set && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSecret('')
                      setRemoveSecret(!removeSecret)
                    }}
                  >
                    {removeSecret ? 'Keep' : 'Remove'}
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Without one, the global CHATWOOT_WEBHOOK_SECRET protects this device&apos;s
                webhooks.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="chatwoot-enabled" className="font-normal">
                Enabled
              </Label>
              <Switch id="chatwoot-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <DialogFooter className="sm:justify-between">
              {existing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() => setConfirmDelete(true)}
                >
                  {remove.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete config
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Save config
              </Button>
            </DialogFooter>
          </form>
        )}

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Chatwoot config for {device.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This also removes the links between its WhatsApp messages and Chatwoot
                conversations. The action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => remove.mutate()}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

/** The per-device URL to paste into the Chatwoot inbox, made absolute when the server sent a path. */
function WebhookUrl({ config }: { config: ChatwootConfig }) {
  const baseUrl = useConnection((state) => state.baseUrl)
  const { data: info } = useAppInfo()
  const webhookUrl = config.webhook_url.startsWith('/')
    ? rerootServerUrl(baseUrl ?? sameOriginBaseUrl(), config.webhook_url, info?.base_path ?? '')
    : config.webhook_url

  const copy = async () => {
    await navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied')
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="chatwoot-webhook-url">Inbox webhook URL</Label>
      <div className="flex gap-2">
        <Input
          id="chatwoot-webhook-url"
          className="font-mono text-xs"
          value={webhookUrl}
          readOnly
        />
        <Button type="button" variant="outline" size="icon" aria-label="Copy" onClick={copy}>
          <Copy className="size-4" />
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Set this on the Chatwoot inbox so agent replies route back to this device.
      </p>
    </div>
  )
}
