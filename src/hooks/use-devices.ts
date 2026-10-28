import { listDevices } from '@/api/devices'
import { usePrivateQuery } from '@/lib/private-query'
import { useConnection } from '@/stores/connection'

export function useDevices() {
  const status = useConnection((state) => state.status)
  return usePrivateQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
    enabled: status === 'connected',
  })
}
