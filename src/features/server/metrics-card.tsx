import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { appMetrics } from '@/api/app'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { formatBytes, formatDuration } from '@/lib/format'
import { usePrivateQuery } from '@/lib/private-query'
import { cn } from '@/lib/utils'
import { useConnection } from '@/stores/connection'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono">{children}</span>
    </div>
  )
}

export function MetricsCard() {
  const status = useConnection((state) => state.status)
  const { data, isLoading, error, refetch, isFetching } = usePrivateQuery({
    queryKey: ['app-metrics'],
    queryFn: appMetrics,
    enabled: status === 'connected',
    refetchInterval: 30_000,
    retry: false,
  })

  const memory = data?.system.memory
  const fs = data?.system.filesystem

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Server health</CardTitle>
          <CardDescription>Reported by GET /app/metrics, refreshed every 30s</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh metrics"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {isLoading && <Skeleton className="h-32" />}
        {error && (
          <p className="text-muted-foreground">
            {toApiError(error).status === 404
              ? 'This server does not expose /app/metrics yet (needs a newer gowa release).'
              : `Couldn't load metrics: ${toApiError(error).message}`}
          </p>
        )}
        {/* A failed poll keeps the last data; hide it rather than show stale numbers. */}
        {!error && data && memory && fs && (
          <>
            <Row label="Uptime">{formatDuration(data.system.uptime_seconds)}</Row>
            <Row label="Devices (connected / logged in / total)">
              {data.devices.connected} / {data.devices.logged_in} / {data.devices.total}
            </Row>
            <Row label="Session store">{data.session_store}</Row>
            {memory.process_rss_bytes !== null ? (
              <Row label="Memory (process)">{formatBytes(memory.process_rss_bytes)}</Row>
            ) : (
              <Row label="Memory (Go runtime)">{formatBytes(memory.runtime_sys_bytes)}</Row>
            )}
            {memory.container_bytes !== null && (
              <Row label="Memory (container)">
                {formatBytes(memory.container_bytes)}
                {memory.container_limit_bytes !== null &&
                  ` of ${formatBytes(memory.container_limit_bytes)}`}
              </Row>
            )}
            {Object.entries(data.system.folders).map(([name, folder]) => (
              <Row key={name} label={`Disk: ${name}`}>
                {formatBytes(folder.bytes)} · {folder.files.toLocaleString()} files
              </Row>
            ))}
            {fs.free_bytes !== null && fs.total_bytes !== null && (
              <Row label="Volume free">
                {formatBytes(fs.free_bytes)} of {formatBytes(fs.total_bytes)}
              </Row>
            )}
            <Row label="Goroutines">{memory.goroutines.toLocaleString()}</Row>
            <Row label="Go">{data.system.go_version}</Row>
          </>
        )}
      </CardContent>
    </Card>
  )
}
