import { TransportGuardError } from '@/lib/api-error'
import { useConnection } from '@/stores/connection'

export function assertActiveConnection(connectionId: string | null): void {
  if (!connectionId || useConnection.getState().connectionId !== connectionId) {
    throw new TransportGuardError(
      'STALE_CONNECTION',
      'Connection changed before this response could be used',
    )
  }
}
