import { getPrivacy } from '@/api/user'
import { Skeleton } from '@/components/ui/skeleton'
import { useSelectedDevice } from '@/hooks/use-device-guard'
import { toApiError } from '@/lib/api-error'
import { usePrivateQuery } from '@/lib/private-query'

export function PrivacyView() {
  const device = useSelectedDevice()
  const { data, isLoading, error } = usePrivateQuery({
    queryKey: ['privacy', device],
    queryFn: getPrivacy,
    enabled: !!device,
  })

  if (isLoading) return <Skeleton className="h-32" />
  if (error) return <p className="text-destructive text-sm">{toApiError(error).message}</p>
  if (!data) return null

  return (
    <div className="flex flex-col gap-2 text-sm">
      <Row label="Who can add to groups" value={data.group_add} />
      <Row label="Who can see last seen" value={data.last_seen} />
      <Row label="Who can see status" value={data.status} />
      <Row label="Who can see profile photo" value={data.profile} />
      <Row label="Read receipts" value={data.read_receipts} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value || '—'}</span>
    </div>
  )
}
