import { useState, type ComponentType, type ReactNode } from 'react'
import {
  CircleUserRound,
  Image,
  ScanSearch,
  Store,
  UserRoundCheck,
  UserRoundSearch,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionCard } from '@/components/shared/action-card'
import { PageHeader } from '@/components/shared/page-header'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'
import { cn } from '@/lib/utils'
import { RecipientBar } from '@/features/messaging/recipient-bar'
import { AvatarForm } from '@/features/account/avatar-form'
import { BusinessProfileForm } from '@/features/account/business-profile-form'
import { ChangeAvatarForm } from '@/features/account/change-avatar-form'
import { ContactsView } from '@/features/account/contacts-view'
import { PrivacyView } from '@/features/account/privacy-view'
import { PushnameForm } from '@/features/account/pushname-form'
import { UserCheckForm } from '@/features/account/user-check-form'
import { UserInfoForm } from '@/features/account/user-info-form'

interface LookupType {
  value: string
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  form: ReactNode
}

const lookups: LookupType[] = [
  {
    value: 'info',
    label: 'User info',
    description: "Look up a user's public info by phone or LID.",
    icon: UserRoundSearch,
    form: <UserInfoForm />,
  },
  {
    value: 'check',
    label: 'User check',
    description: 'Check whether a number is on WhatsApp.',
    icon: UserRoundCheck,
    form: <UserCheckForm />,
  },
  {
    value: 'avatar',
    label: 'Avatar',
    description: 'Fetch a profile picture by phone or group.',
    icon: Image,
    form: <AvatarForm />,
  },
  {
    value: 'business',
    label: 'Business profile',
    description: "Fetch a WhatsApp Business account's public profile.",
    icon: Store,
    form: <BusinessProfileForm />,
  },
]

function LookupPanel() {
  const [type, setType] = useState('info')
  const active = lookups.find((item) => item.value === type) ?? lookups[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      {/* Lookup picker: vertical list on desktop */}
      <div className="hidden flex-col gap-1 lg:flex">
        <p className="text-muted-foreground px-3 text-[11px] font-medium tracking-wider uppercase">
          Lookup
        </p>
        {lookups.map(({ value, label, icon: Icon }) => (
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

      {/* Lookup picker: dropdown on mobile */}
      <div className="flex flex-col gap-2 lg:hidden">
        <Label>Lookup type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lookups.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div key={active.value} className="animate-in fade-in flex flex-col gap-4 duration-200">
          <CardHeader>
            <CardTitle className="text-base">{active.label}</CardTitle>
            <CardDescription>{active.description}</CardDescription>
          </CardHeader>
          <CardContent>{active.form}</CardContent>
        </div>
      </Card>
    </div>
  )
}

export default function AccountPage() {
  const device = useSelectedDevice()

  return (
    <>
      <PageHeader
        title="Account"
        description="Profile, privacy, contacts and lookups for the selected device."
      />
      {!device ? (
        <DeviceGuard />
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">
              <CircleUserRound className="size-4" />
              My profile
            </TabsTrigger>
            <TabsTrigger value="lookup">
              <ScanSearch className="size-4" />
              Lookup
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="flex max-w-2xl flex-col gap-4">
            <ActionCard title="Change avatar" description="Update your own profile picture.">
              <ChangeAvatarForm />
            </ActionCard>
            <ActionCard title="Change push name" description="Update your WhatsApp display name.">
              <PushnameForm />
            </ActionCard>
            <ActionCard title="My privacy" description="Your current privacy settings.">
              <PrivacyView />
            </ActionCard>
            <ActionCard title="My contacts" description="Contacts synced to this device.">
              <ContactsView />
            </ActionCard>
          </TabsContent>
          <TabsContent value="lookup" className="flex flex-col gap-4">
            <RecipientBar showStatus={false} />
            <LookupPanel />
          </TabsContent>
        </Tabs>
      )}
    </>
  )
}
