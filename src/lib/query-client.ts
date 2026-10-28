import { QueryClient } from '@tanstack/react-query'
import { TransportGuardError } from '@/lib/api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 1 && !(error instanceof TransportGuardError),
      refetchOnWindowFocus: false,
    },
  },
})

/** Cancel in-flight server reads and drop cached responses and mutation state. */
export function discardPrivateCache(): void {
  void queryClient.cancelQueries()
  queryClient.clear()
}
