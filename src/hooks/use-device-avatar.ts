import { getUserAvatar } from '@/api/user'
import type { RegistryDevice } from '@/api/types'
import { usePrivateQuery } from '@/lib/private-query'

/** Fetches a device's own profile picture, scoped to that device. */
export function useDeviceAvatar(device: RegistryDevice | undefined) {
  const phone = device?.phone_number || device?.jid || ''
  return usePrivateQuery({
    queryKey: ['device-avatar', device?.id],
    queryFn: () => getUserAvatar({ phone }, device?.id),
    enabled: Boolean(phone) && device?.state === 'logged_in',
    retry: false,
    staleTime: 5 * 60_000,
  })
}
