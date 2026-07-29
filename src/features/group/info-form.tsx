import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight,
  DoorOpen,
  MessageSquare,
  Pencil,
  Timer,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { getGroupInfo, type GroupInfo } from '@/api/group'
import { IdText } from '@/components/shared/id-text'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { formatDate, formatDay, isZeroTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const DAY_SECONDS = 86_400
const HOUR_SECONDS = 3_600

/** WhatsApp offers 24h / 7d / 90d, but render whatever the API reports. */
function formatTimer(seconds: number): string {
  if (seconds >= DAY_SECONDS) {
    const days = Math.round(seconds / DAY_SECONDS)
    return `${days} day${days === 1 ? '' : 's'}`
  }
  if (seconds >= HOUR_SECONDS) {
    const hours = Math.round(seconds / HOUR_SECONDS)
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${seconds}s`
}

function memberAddLabel(mode: string | undefined): string {
  if (mode === 'admin_add') return 'Admins only'
  if (mode === 'all_member_add') return 'All participants'
  return mode || 'Unknown'
}

function addressingLabel(mode: string | undefined): string {
  if (mode === 'lid') return 'LID'
  if (mode === 'pn') return 'Phone number'
  return mode || 'Default'
}

/** Strip the @server suffix so the owner reads as a plain phone number. */
function shortId(jid: string): string {
  return jid.split('@')[0]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="font-heading text-xl leading-none font-semibold">{value}</span>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  value,
  restricted,
}: {
  icon: LucideIcon
  label: string
  value: string
  restricted: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      <span className={cn('text-sm', restricted ? 'font-medium' : 'text-muted-foreground')}>
        {value}
      </span>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="min-w-0 text-right text-sm">{children}</span>
    </div>
  )
}

/** Rare states worth calling out; the everyday settings get their own rows. */
function flagBadges(info: GroupInfo) {
  const flags: { label: string; variant: 'destructive' | 'secondary' | 'outline' }[] = []
  if (info.Suspended) flags.push({ label: 'Suspended', variant: 'destructive' })
  if (info.IsParent) flags.push({ label: 'Community parent', variant: 'secondary' })
  if (info.IsDefaultSubGroup) flags.push({ label: 'Community sub-group', variant: 'secondary' })
  if (info.LinkedParentJID) flags.push({ label: 'Linked to a community', variant: 'outline' })
  if (info.IsIncognito) flags.push({ label: 'Incognito', variant: 'outline' })
  return flags
}

export function GroupOverview({ groupJid }: { groupJid: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['group-info', groupJid],
    queryFn: () => getGroupInfo({ group_id: groupJid }),
    enabled: !!groupJid,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-36" />
      </div>
    )
  }
  if (error) {
    return <p className="text-destructive text-sm">{toApiError(error).message}</p>
  }
  if (!data) return null

  const participants = data.Participants ?? []
  const participantCount = participants.length || (data.ParticipantCount ?? 0)
  const adminCount = participants.filter((participant) => participant.IsAdmin).length
  const owner = data.OwnerPN || data.OwnerJID
  const timer = data.IsEphemeral && data.DisappearingTimer ? data.DisappearingTimer : 0
  const badges = flagBadges(data)

  return (
    <div className="flex flex-col gap-6">
      <Section title="Topic">
        {data.Topic ? (
          <div className="bg-muted/40 rounded-lg border p-3">
            <p className="text-sm whitespace-pre-wrap">{data.Topic}</p>
            {data.TopicSetAt && !isZeroTime(data.TopicSetAt) && (
              <p className="text-muted-foreground mt-2 text-xs">
                Updated {formatDay(data.TopicSetAt)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No topic set.</p>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Participants" value={String(participantCount)} />
        {participants.length > 0 && <StatTile label="Admins" value={String(adminCount)} />}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((flag) => (
            <Badge key={flag.label} variant={flag.variant}>
              {flag.label}
            </Badge>
          ))}
        </div>
      )}

      <Section title="Who can do what">
        <div className="flex flex-col divide-y">
          <SettingRow
            icon={MessageSquare}
            label="Send messages"
            value={data.IsAnnounce ? 'Admins only' : 'All participants'}
            restricted={!!data.IsAnnounce}
          />
          <SettingRow
            icon={Pencil}
            label="Edit group info"
            value={data.IsLocked ? 'Admins only' : 'All participants'}
            restricted={!!data.IsLocked}
          />
          <SettingRow
            icon={UserPlus}
            label="Add participants"
            value={memberAddLabel(data.MemberAddMode)}
            restricted={data.MemberAddMode === 'admin_add'}
          />
          <SettingRow
            icon={DoorOpen}
            label="Join via invite link"
            value={data.IsJoinApprovalRequired ? 'Needs approval' : 'Open'}
            restricted={!!data.IsJoinApprovalRequired}
          />
          <SettingRow
            icon={Timer}
            label="Disappearing messages"
            value={timer ? formatTimer(timer) : 'Off'}
            restricted={!!timer}
          />
        </div>
      </Section>

      <Section title="Details">
        <div className="flex flex-col divide-y">
          <DetailRow label="Owner">
            <IdText value={owner ? shortId(owner) : '—'} />
          </DetailRow>
          <DetailRow label="Created">
            {isZeroTime(data.GroupCreated) ? '—' : formatDate(data.GroupCreated)}
          </DetailRow>
          {data.NameSetAt && !isZeroTime(data.NameSetAt) && (
            <DetailRow label="Name set">{formatDay(data.NameSetAt)}</DetailRow>
          )}
          <DetailRow label="Addressing mode">{addressingLabel(data.AddressingMode)}</DetailRow>
          {data.CreatorCountryCode && (
            <DetailRow label="Creator region">{data.CreatorCountryCode}</DetailRow>
          )}
        </div>
      </Section>

      <details className="group/raw rounded-lg border">
        <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 p-3 text-xs font-medium select-none">
          <ChevronRight className="size-3.5 transition-transform group-open/raw:rotate-90" />
          Raw response
        </summary>
        <pre className="text-muted-foreground overflow-x-auto border-t p-3 font-mono text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}
