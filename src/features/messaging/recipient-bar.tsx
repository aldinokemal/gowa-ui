import { useEffect } from 'react'
import { History } from 'lucide-react'
import { IdText } from '@/components/shared/id-text'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { composeJid, isStatus, recipientOptions, type RecipientType } from '@/lib/jid'
import { useRecipientStore } from '@/stores/recipient'

/**
 * The shared recipient bar: entered once here, consumed by every form that
 * calls useRecipientJid(). Used by the Messaging and Account workspaces.
 */
export function RecipientBar({ showStatus = true }: { showStatus?: boolean }) {
  const recipient = useRecipientStore((state) => state.recipient)
  const recents = useRecipientStore((state) => state.recents)
  const setRecipient = useRecipientStore((state) => state.setRecipient)
  const pushRecent = useRecipientStore((state) => state.pushRecent)
  const options = recipientOptions.filter((option) => showStatus || option.value !== 'status')
  const jid = composeJid(recipient.phone, recipient.type)

  useEffect(() => {
    if (!showStatus && isStatus(recipient.type)) {
      setRecipient({ ...recipient, type: 'user' })
    }
  }, [showStatus, recipient, setRecipient])

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label>Recipient type</Label>
          <Select
            value={recipient.type}
            onValueChange={(type) => setRecipient({ ...recipient, type: type as RecipientType })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isStatus(recipient.type) && (
          <div className="flex min-w-48 flex-1 flex-col gap-2">
            <Label htmlFor="recipient-phone">Phone / Group ID</Label>
            <Input
              id="recipient-phone"
              placeholder="628xxxxxxxxxx"
              value={recipient.phone}
              onChange={(event) => setRecipient({ ...recipient, phone: event.target.value })}
              onBlur={() => pushRecent(recipient)}
            />
          </div>
        )}

        {recents.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Recent recipients">
                <History className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {recents.map((recent) => (
                <DropdownMenuItem
                  key={`${recent.type}:${recent.phone}`}
                  onClick={() => setRecipient(recent)}
                >
                  <span className="font-mono text-xs">{recent.phone}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {recipientOptions.find((option) => option.value === recent.type)?.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {jid && (
          <div className="w-full">
            <IdText value={jid} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
