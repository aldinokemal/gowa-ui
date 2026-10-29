import { Compass, Newspaper, PhoneOff } from 'lucide-react'
import { ActionCard } from '@/components/shared/action-card'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CallRejectForm } from '@/features/call/call-reject-form'
import { ChannelDirectory } from '@/features/newsletter/channel-directory'
import { ChannelLookupForm } from '@/features/newsletter/channel-lookup-form'
import { LiveUpdatesList } from '@/features/newsletter/live-updates'
import { NewsletterList } from '@/features/newsletter/newsletter-list'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'

export default function MiscPage() {
  const device = useSelectedDevice()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Channels & Calls"
        description="Follow and find channels, read their posts and engagement, and handle calls."
      />

      {!device ? (
        <DeviceGuard />
      ) : (
        <Tabs defaultValue="following">
          <TabsList>
            <TabsTrigger value="following">
              <Newspaper className="size-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="discover">
              <Compass className="size-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="calls">
              <PhoneOff className="size-4" />
              Calls
            </TabsTrigger>
          </TabsList>
          <TabsContent value="following" className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
            <ActionCard title="Newsletters" description="Channels this device follows.">
              <NewsletterList />
            </ActionCard>
            <ActionCard
              title="Live updates"
              description="Counter subscriptions GOWA keeps renewing until stopped or restarted."
            >
              <LiveUpdatesList />
            </ActionCard>
          </TabsContent>
          <TabsContent value="discover" className="grid items-start gap-4 lg:grid-cols-2">
            <ActionCard
              title="Find channels"
              description="Browse WhatsApp's channel directory or search it by name."
            >
              <ChannelDirectory />
            </ActionCard>
            <ActionCard
              title="Look up channel"
              description="Get a channel's details by ID or invite link, without following it."
            >
              <ChannelLookupForm />
            </ActionCard>
          </TabsContent>
          <TabsContent value="calls" className="max-w-xl">
            <ActionCard
              title="Reject call"
              description="Reject an incoming call using the caller JID and call ID from the webhook."
            >
              <CallRejectForm />
            </ActionCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
