import { useState, type ComponentType, type ReactNode } from 'react'
import {
  BarChart3,
  FileUp,
  Image,
  Keyboard,
  Link2,
  ListChecks,
  MapPin,
  MessageSquareText,
  Mic,
  MousePointerClick,
  Radio,
  Send,
  Sticker,
  UserRound,
  UserRoundSearch,
  Video,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'
import { cn } from '@/lib/utils'
import { RecipientBar } from '@/features/messaging/recipient-bar'
import { SendTextForm } from '@/features/send/text-form'
import { SendImageForm } from '@/features/send/image-form'
import { SendFileForm } from '@/features/send/file-form'
import { SendVideoForm } from '@/features/send/video-form'
import { SendStickerForm } from '@/features/send/sticker-form'
import { SendAudioForm } from '@/features/send/audio-form'
import { SendContactForm } from '@/features/send/contact-form'
import { SendLocationForm } from '@/features/send/location-form'
import { SendLinkForm } from '@/features/send/link-form'
import { SendPollForm } from '@/features/send/poll-form'
import { SendPresenceForm } from '@/features/send/presence-form'
import { SendChatPresenceForm } from '@/features/send/chat-presence-form'
import { SendInteractiveForm } from '@/features/send/interactive-form'
import { SubscribePresenceForm } from '@/features/send/subscribe-presence-form'
import {
  DeleteForm,
  ForwardForm,
  PlayedForm,
  ReactForm,
  ReadForm,
  RevokeForm,
  StarForm,
  UpdateForm,
} from '@/features/message/message-forms'

interface ComposeType {
  value: string
  label: string
  icon: ComponentType<{ className?: string }>
  form: ReactNode
}

const composeGroups: { label: string; items: ComposeType[] }[] = [
  {
    label: 'Message',
    items: [{ value: 'text', label: 'Text', icon: MessageSquareText, form: <SendTextForm /> }],
  },
  {
    label: 'Media',
    items: [
      { value: 'image', label: 'Image', icon: Image, form: <SendImageForm /> },
      { value: 'video', label: 'Video', icon: Video, form: <SendVideoForm /> },
      { value: 'file', label: 'File', icon: FileUp, form: <SendFileForm /> },
      { value: 'audio', label: 'Audio', icon: Mic, form: <SendAudioForm /> },
      { value: 'sticker', label: 'Sticker', icon: Sticker, form: <SendStickerForm /> },
    ],
  },
  {
    label: 'Rich',
    items: [
      { value: 'contact', label: 'Contact', icon: UserRound, form: <SendContactForm /> },
      { value: 'location', label: 'Location', icon: MapPin, form: <SendLocationForm /> },
      { value: 'link', label: 'Link', icon: Link2, form: <SendLinkForm /> },
      { value: 'poll', label: 'Poll', icon: BarChart3, form: <SendPollForm /> },
      {
        value: 'interactive',
        label: 'Interactive',
        icon: MousePointerClick,
        form: <SendInteractiveForm />,
      },
    ],
  },
  {
    label: 'Presence',
    items: [
      { value: 'presence', label: 'Presence', icon: Radio, form: <SendPresenceForm /> },
      {
        value: 'chat-presence',
        label: 'Chat presence',
        icon: Keyboard,
        form: <SendChatPresenceForm />,
      },
      {
        value: 'subscribe-presence',
        label: 'Watch presence',
        icon: UserRoundSearch,
        form: <SubscribePresenceForm />,
      },
    ],
  },
]

const allComposeTypes = composeGroups.flatMap((group) => group.items)

function ComposePanel() {
  const [type, setType] = useState('text')
  const active = allComposeTypes.find((item) => item.value === type) ?? allComposeTypes[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      {/* Type picker: vertical list on desktop */}
      <div className="hidden flex-col gap-3 lg:flex">
        {composeGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="text-muted-foreground px-3 text-[11px] font-medium tracking-wider uppercase">
              {group.label}
            </p>
            {group.items.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={type === value}
                className={cn(
                  'flex items-center gap-2.5 rounded-full px-3 py-2 text-left text-sm font-medium transition-colors',
                  type === value
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Type picker: dropdown on mobile */}
      <div className="flex flex-col gap-2 lg:hidden">
        <Label>Message type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {composeGroups.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent key={active.value} className="animate-in fade-in duration-200">
          {active.form}
        </CardContent>
      </Card>
    </div>
  )
}

const actions = [
  { value: 'react', label: 'React', render: (id: string) => <ReactForm messageId={id} /> },
  { value: 'update', label: 'Edit text', render: (id: string) => <UpdateForm messageId={id} /> },
  { value: 'read', label: 'Mark as read', render: (id: string) => <ReadForm messageId={id} /> },
  {
    value: 'played',
    label: 'Mark audio as played',
    render: (id: string) => <PlayedForm messageId={id} />,
  },
  { value: 'star', label: 'Star / Unstar', render: (id: string) => <StarForm messageId={id} /> },
  {
    value: 'revoke',
    label: 'Revoke (delete for everyone)',
    render: (id: string) => <RevokeForm messageId={id} />,
  },
  {
    value: 'delete',
    label: 'Delete (for me)',
    render: (id: string) => <DeleteForm messageId={id} />,
  },
  { value: 'forward', label: 'Forward', render: (id: string) => <ForwardForm messageId={id} /> },
]

function ActPanel() {
  const [messageId, setMessageId] = useState('')
  const [action, setAction] = useState('react')
  const active = actions.find((item) => item.value === action) ?? actions[0]

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="act-message-id">Message ID</Label>
            <Input
              id="act-message-id"
              className="font-mono"
              value={messageId}
              onChange={(event) => setMessageId(event.target.value)}
              placeholder="3EB0..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div key={active.value} className="animate-in fade-in duration-200">
          {active.render(messageId)}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MessagingPage() {
  const device = useSelectedDevice()

  return (
    <>
      <PageHeader
        title="Messaging"
        description="Pick a recipient once, then compose messages or act on existing ones."
      />
      {device === null ? (
        <DeviceGuard />
      ) : (
        <>
          <RecipientBar />
          <Tabs defaultValue="compose">
            <TabsList>
              <TabsTrigger value="compose">
                <Send className="size-4" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="act">
                <ListChecks className="size-4" />
                Act on a message
              </TabsTrigger>
            </TabsList>
            <TabsContent value="compose">
              <ComposePanel />
            </TabsContent>
            <TabsContent value="act">
              <ActPanel />
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  )
}
