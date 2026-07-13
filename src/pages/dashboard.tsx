import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateDeviceDialog } from '@/features/devices/create-device-dialog'
import { DeviceCard } from '@/features/devices/device-card'
import { LoginCodeDialog } from '@/features/session/login-code-dialog'
import { LoginQrDialog } from '@/features/session/login-qr-dialog'
import { useDevices } from '@/hooks/use-devices'
import { toApiError } from '@/lib/api-error'
import type { RegistryDevice } from '@/api/types'

export default function DashboardPage() {
  const { data: devices, isLoading, error } = useDevices()
  const [qrDevice, setQrDevice] = useState<RegistryDevice | null>(null)
  const [codeDevice, setCodeDevice] = useState<RegistryDevice | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Devices</h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp accounts connected to this server
          </p>
        </div>
        <CreateDeviceDialog />
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">
            Failed to load devices: {toApiError(error).message}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )}

      {devices && devices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Smartphone className="size-8 text-muted-foreground" />
            <p className="font-medium">No devices yet</p>
            <p className="text-sm text-muted-foreground">
              Add a device slot, then pair it with your phone via QR or pairing code.
            </p>
          </CardContent>
        </Card>
      )}

      {devices && devices.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onLoginQr={setQrDevice}
              onLoginCode={setCodeDevice}
            />
          ))}
        </div>
      )}

      <LoginQrDialog device={qrDevice} onOpenChange={(open) => !open && setQrDevice(null)} />
      <LoginCodeDialog device={codeDevice} onOpenChange={(open) => !open && setCodeDevice(null)} />
    </div>
  )
}
