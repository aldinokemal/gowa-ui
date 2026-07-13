import { useQuery } from '@tanstack/react-query'
import { appInfo } from '@/api/app'
import { useConnection } from '@/stores/connection'

export function useAppInfo() {
  const status = useConnection((state) => state.status)
  return useQuery({
    queryKey: ['app-info'],
    queryFn: appInfo,
    enabled: status === 'connected',
    staleTime: Infinity,
    retry: false,
  })
}
