import { useEffect } from 'react'
import { Smartphone } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDevices } from '@/hooks/use-devices'
import { cn } from '@/lib/utils'
import { useDeviceStore } from '@/stores/device'
import type { DeviceState } from '@/api/types'

const stateDots: Record<DeviceState, string> = {
  logged_in: 'bg-emerald-500',
  connected: 'bg-sky-500',
  connecting: 'bg-amber-500',
  disconnected: 'bg-muted-foreground/40',
}

export function DeviceSwitcher() {
  const { data: devices } = useDevices()
  const selectedDeviceId = useDeviceStore((state) => state.selectedDeviceId)
  const selectDevice = useDeviceStore((state) => state.selectDevice)

  useEffect(() => {
    if (!devices) return
    const exists = devices.some((device) => device.id === selectedDeviceId)
    if (!exists) selectDevice(devices[0]?.id ?? null)
  }, [devices, selectedDeviceId, selectDevice])

  if (!devices?.length) return null

  return (
    <Select value={selectedDeviceId ?? undefined} onValueChange={selectDevice}>
      <SelectTrigger size="sm" className="w-44 md:w-56">
        <Smartphone className="size-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Select device" />
      </SelectTrigger>
      <SelectContent>
        {devices.map((device) => (
          <SelectItem key={device.id} value={device.id}>
            <span className={cn('size-2 shrink-0 rounded-full', stateDots[device.state])} />
            <span className="truncate">{device.display_name || device.id}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
