import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, MoreVertical, QrCode, RefreshCw, Trash2, Unplug, Webhook } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StateBadge } from '@/features/devices/state-badge'
import { DeviceWebhookDialog } from '@/features/devices/webhook-dialog'
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
  const selected = selectedDeviceId === device.id

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
    <Card className={cn('gap-4', selected && 'border-primary/50 ring-1 ring-primary/30')}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <p className="truncate font-medium">{device.display_name || device.id}</p>
          <p className="truncate text-xs text-muted-foreground">
            {device.jid || device.phone_number || 'not paired yet'}
          </p>
        </div>
        <StateBadge state={device.state} />
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
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
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>

      <DeviceWebhookDialog device={device} open={webhookOpen} onOpenChange={setWebhookOpen} />

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
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
