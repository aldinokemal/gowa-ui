import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getDeviceWebhook, updateDeviceWebhook } from '@/api/devices'
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
import { toApiError } from '@/lib/api-error'
import type { RegistryDevice } from '@/api/types'

export function DeviceWebhookDialog({
  device,
  open,
  onOpenChange,
}: {
  device: RegistryDevice
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [events, setEvents] = useState('')
  const [insecureSkipVerify, setInsecureSkipVerify] = useState(false)

  const config = useQuery({
    queryKey: ['device-webhook', device.id],
    queryFn: () => getDeviceWebhook(device.id),
    enabled: open,
  })

  useEffect(() => {
    if (config.data) {
      setUrl(config.data.webhook_url)
      setSecret(config.data.webhook_secret)
      setEvents(config.data.webhook_events)
      setInsecureSkipVerify(config.data.webhook_insecure_skip_verify)
    }
  }, [config.data])

  const save = useMutation({
    mutationFn: () =>
      updateDeviceWebhook(device.id, {
        webhook_url: url.trim(),
        webhook_secret: secret.trim(),
        webhook_events: events.trim(),
        webhook_insecure_skip_verify: insecureSkipVerify,
      }),
    onSuccess: () => {
      toast.success(`Webhook updated for ${device.id}`)
      void queryClient.invalidateQueries({ queryKey: ['device-webhook', device.id] })
      onOpenChange(false)
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
          <DialogTitle>Webhook for {device.display_name || device.id}</DialogTitle>
          <DialogDescription>
            Events from this device are POSTed to the URL below. Leave the URL empty and save to
            disable the webhook.
          </DialogDescription>
        </DialogHeader>
        {config.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="device-webhook-url">Webhook URL</Label>
              <Input
                id="device-webhook-url"
                placeholder="https://example.com/webhook"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="device-webhook-secret">Secret (optional)</Label>
              <Input
                id="device-webhook-secret"
                placeholder="used to sign payloads (X-Hub-Signature-256)"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="device-webhook-events">Events (optional)</Label>
              <Input
                id="device-webhook-events"
                placeholder="comma-separated; empty forwards all events"
                value={events}
                onChange={(event) => setEvents(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="device-webhook-skip-verify" className="font-normal">
                Skip TLS certificate verification (insecure)
              </Label>
              <Switch
                id="device-webhook-skip-verify"
                checked={insecureSkipVerify}
                onCheckedChange={setInsecureSkipVerify}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Save webhook
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
