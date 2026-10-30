import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleUserRound,
  Headset,
  KeyRound,
  MoreVertical,
  QrCode,
  RefreshCw,
  Trash2,
  Unplug,
  Webhook,
} from 'lucide-react'
import { toast } from 'sonner'
import { logoutDevice, reconnectDevice, removeDevice } from '@/api/devices'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeviceChatwootDialog } from '@/features/devices/chatwoot-dialog'
import { StateBadge } from '@/features/devices/state-badge'
import { DeviceWebhookDialog } from '@/features/devices/webhook-dialog'
import { useAppInfo } from '@/hooks/use-app-info'
import { useDeviceAvatar } from '@/hooks/use-device-avatar'
import { toApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/device'
import type { RegistryDevice } from '@/api/types'

export function DeviceCard({
  device,
  onLoginQr,
  onLoginCode,
}: {
  device: RegistryDevice
  onLoginQr: (device: RegistryDevice) => void
  onLoginCode: (device: RegistryDevice) => void
}) {
  const queryClient = useQueryClient()
  const selectedDeviceId = useDeviceStore((state) => state.selectedDeviceId)
  const selectDevice = useDeviceStore((state) => state.selectDevice)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [webhookOpen, setWebhookOpen] = useState(false)
  const [chatwootOpen, setChatwootOpen] = useState(false)
  // The server registers the Chatwoot config routes only when CHATWOOT_ENABLED is on.
  const chatwootEnabled = useAppInfo().data?.chatwoot_enabled ?? false
  const selected = selectedDeviceId === device.id
  const avatar = useDeviceAvatar(device)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['devices'] })

  const logout = useMutation({
    mutationFn: () => logoutDevice(device.id),
    onSuccess: () => {
      toast.success(`Logout requested for ${device.id}`)
      void invalidate()
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const reconnect = useMutation({
    mutationFn: () => reconnectDevice(device.id),
    onSuccess: () => {
      toast.success(`Reconnect requested for ${device.id}`)
      void invalidate()
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  const remove = useMutation({
    mutationFn: () => removeDevice(device.id),
    onSuccess: () => {
      toast.success(`Device ${device.id} removed`)
      if (selected) selectDevice(null)
      void invalidate()
    },
    onError: (error) => toast.error(toApiError(error).message),
  })

  return (
    <Card className={cn('gap-4', selected && 'border-primary/50 ring-primary/30 ring-1')}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg">
            {avatar.data?.url && (
              <AvatarImage src={avatar.data.url} alt={device.display_name || device.id} />
            )}
            <AvatarFallback>
              <CircleUserRound className="text-muted-foreground size-5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{device.display_name || device.id}</p>
            <p className="text-muted-foreground truncate text-xs">
              {device.jid || device.phone_number || 'not paired yet'}
            </p>
          </div>
        </div>
        <StateBadge state={device.state} />
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs">
        <p className="truncate">ID: {device.id}</p>
        <p>Created {formatDate(device.created_at)}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button
          variant={selected ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => selectDevice(device.id)}
          disabled={selected}
        >
          {selected ? 'Selected' : 'Use this device'}
        </Button>
        <div className="flex items-center gap-1">
          {device.state !== 'logged_in' && (
            <Button variant="outline" size="sm" onClick={() => onLoginQr(device)}>
              <QrCode className="size-4" />
              Pair
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Device actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onLoginQr(device)}>
                <QrCode className="size-4" /> Login with QR
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLoginCode(device)}>
                <KeyRound className="size-4" /> Login with code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => reconnect.mutate()}>
                <RefreshCw className="size-4" /> Reconnect
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout.mutate()}>
                <Unplug className="size-4" /> Logout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWebhookOpen(true)}>
                <Webhook className="size-4" /> Webhook
              </DropdownMenuItem>
              {chatwootEnabled && (
                <DropdownMenuItem onClick={() => setChatwootOpen(true)}>
                  <Headset className="size-4" /> Chatwoot
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>

      <DeviceWebhookDialog device={device} open={webhookOpen} onOpenChange={setWebhookOpen} />
      {chatwootEnabled && (
        <DeviceChatwootDialog device={device} open={chatwootOpen} onOpenChange={setChatwootOpen} />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete device {device.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the device slot and its WhatsApp session from the server. The action
              cannot be undone.
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
    </Card>
  )
}
