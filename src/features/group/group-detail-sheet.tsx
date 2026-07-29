import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IdText } from '@/components/shared/id-text'
import { GroupOverview } from '@/features/group/info-form'
import { InviteLinkForm } from '@/features/group/invite-link-form'
import { ParticipantRequests } from '@/features/group/participant-requests'
import { ParticipantsPanel } from '@/features/group/participants-panel'
import { SetAnnounceForm } from '@/features/group/set-announce-form'
import { SetLockedForm } from '@/features/group/set-locked-form'
import { SetNameForm } from '@/features/group/set-name-form'
import { SetPhotoForm } from '@/features/group/set-photo-form'
import { SetTopicForm } from '@/features/group/set-topic-form'
import type { MyGroup } from '@/api/group'

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </div>
  )
}

export function GroupDetailSheet({
  group,
  onOpenChange,
}: {
  group: MyGroup | null
  onOpenChange: (open: boolean) => void
}) {
  const groupJid = group?.JID ?? ''

  return (
    <Sheet open={!!group} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="truncate pr-8">{group?.Name || 'Group'}</SheetTitle>
          <SheetDescription asChild>
            <IdText value={groupJid} />
          </SheetDescription>
        </SheetHeader>
        {group && (
          <div className="px-4 pb-6">
            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex flex-col gap-6 pt-4">
                <GroupOverview groupJid={groupJid} />
                <Separator />
                <SettingsSection title="Invite link">
                  <InviteLinkForm groupJid={groupJid} />
                </SettingsSection>
              </TabsContent>

              <TabsContent value="participants" className="flex flex-col gap-6 pt-4">
                <ParticipantsPanel groupJid={groupJid} />
                <Separator />
                <SettingsSection title="Join requests">
                  <ParticipantRequests groupJid={groupJid} />
                </SettingsSection>
              </TabsContent>

              <TabsContent value="settings" className="flex flex-col gap-6 pt-4">
                <SettingsSection title="Name">
                  <SetNameForm groupJid={groupJid} initialName={group.Name} />
                </SettingsSection>
                <Separator />
                <SettingsSection title="Topic">
                  <SetTopicForm groupJid={groupJid} initialTopic={group.Topic} />
                </SettingsSection>
                <Separator />
                <SettingsSection title="Photo">
                  <SetPhotoForm groupJid={groupJid} />
                </SettingsSection>
                <Separator />
                <SettingsSection title="Permissions">
                  <div className="flex flex-col gap-6">
                    <SetAnnounceForm groupJid={groupJid} initialAnnounce={group.IsAnnounce} />
                    <SetLockedForm groupJid={groupJid} initialLocked={group.IsLocked} />
                  </div>
                </SettingsSection>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
