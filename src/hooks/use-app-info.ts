import { appInfo } from '@/api/app'
import { usePrivateQuery } from '@/lib/private-query'
import { useConnection } from '@/stores/connection'

export function useAppInfo() {
  const status = useConnection((state) => state.status)
  return usePrivateQuery({
    queryKey: ['app-info'],
    queryFn: appInfo,
    enabled: status === 'connected',
    staleTime: Infinity,
    retry: false,
  })
}
