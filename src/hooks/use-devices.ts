import { useQuery } from '@tanstack/react-query'
import { listDevices } from '@/api/devices'
import { useConnection } from '@/stores/connection'

export function useDevices() {
  const status = useConnection((state) => state.status)
  return useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
    enabled: status === 'connected',
  })
}
