import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, MoreVertical, ShieldMinus, ShieldPlus, UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  addParticipants,
  demoteParticipants,
  listParticipants,
  promoteParticipants,
  removeParticipants,
  type GroupParticipant,
} from '@/api/group'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { usePrivateQuery } from '@/lib/private-query'

/** Split an input into a trimmed list, one entry per comma. */
function parseList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function participantId(participant: GroupParticipant): string {
  return participant.phone_number || participant.jid
}

export function ParticipantsPanel({ groupJid }: { groupJid: string }) {
  const queryClient = useQueryClient()
  const [newParticipants, setNewParticipants] = useState('')
  const groupId = groupJid

  const { data, isLoading, error } = usePrivateQuery({
    queryKey: ['group-participants', groupId],
    queryFn: () => listParticipants({ group_id: groupId }),
    enabled: !!groupJid,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['group-participants', groupId] })
    void queryClient.invalidateQueries({ queryKey: ['groups'] })
  }

  const add = useMutation({
    mutationFn: () =>
      addParticipants({ group_id: groupId, participants: parseList(newParticipants) }),
    onSuccess: () => {
      toast.success('Participants added')
      setNewParticipants('')
      invalidate()
    },
    onError: (mutationError) => toast.error(toApiError(mutationError).message),
  })

  const rowAction = useMutation({
    mutationFn: ({
      action,
      participant,
    }: {
      action: 'promote' | 'demote' | 'remove'
      participant: GroupParticipant
    }) => {
      const payload = { group_id: groupId, participants: [participantId(participant)] }
      if (action === 'promote') return promoteParticipants(payload)
      if (action === 'demote') return demoteParticipants(payload)
      return removeParticipants(payload)
    },
    onSuccess: (_result, variables) => {
      toast.success(`${variables.action} applied to ${participantId(variables.participant)}`)
      invalidate()
    },
    onError: (mutationError) => toast.error(toApiError(mutationError).message),
  })

  const participants = data?.participants ?? []

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (parseList(newParticipants).length > 0) add.mutate()
        }}
      >
        <Input
          placeholder="628xxxxxxxxxx, comma-separated"
          value={newParticipants}
          onChange={(event) => setNewParticipants(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={add.isPending}>
          {add.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Add
        </Button>
      </form>

      {error && (
        <p className="text-destructive text-sm">
          Failed to load participants: {toApiError(error).message}
        </p>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}

      {!isLoading && !error && (
        <div>
          <div className="flex flex-col divide-y">
            {participants.map((participant) => (
              <div key={participant.jid} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {participant.display_name || participant.phone_number || participant.jid}
                  </p>
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {participant.jid}
                  </p>
                </div>
                {participant.is_super_admin && <Badge>Super admin</Badge>}
                {participant.is_admin && !participant.is_super_admin && (
                  <Badge variant="secondary">Admin</Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${participantId(participant)}`}
                      disabled={rowAction.isPending}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!participant.is_admin && (
                      <DropdownMenuItem
                        onClick={() => rowAction.mutate({ action: 'promote', participant })}
                      >
                        <ShieldPlus className="size-4" /> Promote to admin
                      </DropdownMenuItem>
                    )}
                    {participant.is_admin && !participant.is_super_admin && (
                      <DropdownMenuItem
                        onClick={() => rowAction.mutate({ action: 'demote', participant })}
                      >
                        <ShieldMinus className="size-4" /> Demote
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => rowAction.mutate({ action: 'remove', participant })}
                    >
                      <UserMinus className="size-4" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No participants returned for this group.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
