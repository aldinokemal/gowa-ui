import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { addDevice } from '@/api/devices'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toApiError } from '@/lib/api-error'
import { useDeviceStore } from '@/stores/device'

export function CreateDeviceDialog() {
  const queryClient = useQueryClient()
  const selectDevice = useDeviceStore((state) => state.selectDevice)
  const [open, setOpen] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  const mutation = useMutation({
    mutationFn: addDevice,
    onSuccess: (device) => {
      toast.success(`Device ${device.id} added`)
      void queryClient.invalidateQueries({ queryKey: ['devices'] })
      selectDevice(device.id)
      setOpen(false)
      setDeviceId('')
      setWebhookUrl('')
      setWebhookSecret('')
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate({
      device_id: deviceId.trim() || undefined,
      webhook_url: webhookUrl.trim() || undefined,
      webhook_secret: webhookSecret.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add device</DialogTitle>
          <DialogDescription>
            Registers a device slot. Pair it with a phone afterwards via QR or pairing code.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="device-id">Device ID (optional)</Label>
            <Input
              id="device-id"
              placeholder="auto-generated when empty"
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-url">Webhook URL (optional)</Label>
            <Input
              id="webhook-url"
              placeholder="https://example.com/webhook"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-secret">Webhook secret (optional)</Label>
            <Input
              id="webhook-secret"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Add device
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
