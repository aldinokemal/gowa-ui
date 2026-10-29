import { useMemo } from 'react'
import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query'
import { assertActiveConnection } from '@/lib/connection-guard'
import { useConnection } from '@/stores/connection'

export function scopedQueryKey(queryKey: QueryKey, connectionId: string | null) {
  return [...queryKey, connectionId] as const
}

/** Run a query function only while its connection is still the active one. */
export function trackedQueryFn<TData>(connectionId: string | null, queryFn: () => Promise<TData>) {
  return async () => {
    assertActiveConnection(connectionId)
    const data = await queryFn()
    assertActiveConnection(connectionId)
    return data
  }
}

/**
 * keepPreviousData, but never across a connection change. The connection id
 * is the last element of every private query key.
 */
export function sameConnectionPlaceholder<TData>(connectionId: string | null) {
  return (
    previousData: TData | undefined,
    previousQuery?: { queryKey: readonly unknown[] },
  ): TData | undefined => {
    const previousId = previousQuery?.queryKey[previousQuery.queryKey.length - 1]
    if (previousId !== connectionId) return undefined
    return previousData
  }
}

/** Typed as keepPreviousData so query inference stays on the query function. */
export function connectionPlaceholder<TData>(connectionId: string | null) {
  return sameConnectionPlaceholder<TData>(connectionId) as unknown as typeof keepPreviousData
}

/**
 * A server-backed query whose cache entry cannot satisfy a different connection.
 * Invalidations that prefix-match the caller's key still match, because the
 * connection id is appended.
 */
export function usePrivateQuery<TData>(options: {
  queryKey: QueryKey
  queryFn: () => Promise<TData>
  enabled?: boolean
  staleTime?: number
  retry?: boolean | number
  refetchInterval?: number | false
  placeholderData?: typeof keepPreviousData
}) {
  const connectionId = useConnection((state) => state.connectionId)
  const keepPrevious = options.placeholderData === keepPreviousData
  const placeholderData = useMemo(
    () => (keepPrevious ? connectionPlaceholder<TData>(connectionId) : undefined),
    [keepPrevious, connectionId],
  )

  return useQuery<TData, Error>({
    queryKey: scopedQueryKey(options.queryKey, connectionId),
    queryFn: trackedQueryFn(connectionId, options.queryFn),
    enabled: (options.enabled ?? true) && connectionId !== null,
    ...(options.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
    ...(options.retry !== undefined ? { retry: options.retry } : {}),
    ...(options.refetchInterval !== undefined ? { refetchInterval: options.refetchInterval } : {}),
    ...(placeholderData ? { placeholderData } : {}),
  })
}
