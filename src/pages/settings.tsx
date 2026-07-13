import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppInfo } from '@/hooks/use-app-info'
import { formatBytes } from '@/lib/format'
import { useConnection } from '@/stores/connection'

export default function SettingsPage() {
  const baseUrl = useConnection((state) => state.baseUrl)
  const username = useConnection((state) => state.username)
  const disconnect = useConnection((state) => state.disconnect)
  const { data: info, isLoading: infoLoading, error: infoError } = useAppInfo()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Where this dashboard sends its requests</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Server</span>
            <span className="truncate font-mono">{baseUrl}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Username</span>
            <span className="font-mono">{username || '— (no basic auth)'}</span>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server</CardTitle>
          <CardDescription>Reported by GET /app/info</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {infoLoading && <Skeleton className="h-20" />}
          {infoError && (
            <p className="text-muted-foreground">
              This server does not expose /app/info yet (needs the cross-origin enablers update).
            </p>
          )}
          {info && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">{info.version}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Device OS name</span>
                <span className="font-mono">{info.os}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Max image / file / video</span>
                <span className="font-mono">
                  {formatBytes(info.max_image_size)} / {formatBytes(info.max_file_size)} /{' '}
                  {formatBytes(info.max_video_size)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}
