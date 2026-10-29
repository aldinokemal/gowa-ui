import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isRemoteInsecureHttp, normalizeBaseUrl } from '@/lib/url'
import { useConnection, type TestResult } from '@/stores/connection'

const errorMessages: Record<Exclude<TestResult, 'ok'>, string> = {
  unauthorized: 'The server rejected these credentials (401).',
  'not-gowa': 'That URL answered, but it does not look like a gowa server.',
  unreachable: 'Could not reach the server. Check the URL and that gowa is running.',
  insecure:
    'Credentials are not sent to a remote HTTP server. Use HTTPS, or allow insecure HTTP for a server you trust.',
}

export default function ConnectPage() {
  const navigate = useNavigate()
  const status = useConnection((state) => state.status)
  const storedUrl = useConnection((state) => state.baseUrl)
  const storedUser = useConnection((state) => state.username)
  const storedInsecure = useConnection((state) => state.allowInsecureHttp)
  const connect = useConnection((state) => state.connect)

  const [url, setUrl] = useState(
    storedUrl ?? (import.meta.env.VITE_DEFAULT_SERVER_URL as string | undefined) ?? '',
  )
  const [username, setUsername] = useState(storedUser ?? '')
  const [password, setPassword] = useState('')
  const [allowInsecureHttp, setAllowInsecureHttp] = useState(storedInsecure)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remoteHttp = isRemoteInsecureHttp(normalizeBaseUrl(url))

  if (status === 'connected') return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await connect(
      url,
      username || undefined,
      password || undefined,
      allowInsecureHttp,
    )
    setSubmitting(false)
    if (result === 'ok') {
      navigate('/', { replace: true })
    } else {
      setError(errorMessages[result])
    }
  }

  return (
    <div className="bg-background relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="bg-[radial-gradient(ellipse_at_top,--theme(--color-primary/12%),transparent_60%)] pointer-events-none absolute inset-0"
      />
      <Card className="animate-in fade-in slide-in-from-bottom-2 relative w-full max-w-md duration-500">
        <CardHeader>
          <Logo className="mb-2 [&_img]:size-10 [&_span]:text-xl" />
          <CardTitle>Connect to your gowa server</CardTitle>
          <CardDescription>
            The server URL and optional basic-auth credentials are stored in this browser only. An
            address without a scheme is treated as HTTPS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="server-url">Server URL</Label>
              <Input
                id="server-url"
                placeholder="http://localhost:3000"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            {remoteHttp && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="allow-insecure-http"
                  checked={allowInsecureHttp}
                  onCheckedChange={(checked) => setAllowInsecureHttp(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="allow-insecure-http" className="leading-snug font-normal">
                    Allow credentials over HTTP
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    The username and password would be readable on this connection. Enable this only
                    for a server you trust that cannot use HTTPS.
                  </p>
                </div>
              </div>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            {status === 'unauthorized' && !error && (
              <p className="text-destructive text-sm">
                The stored credentials were rejected — enter them again.
              </p>
            )}
            {status === 'unreachable' && !error && (
              <p className="text-muted-foreground text-sm">
                The stored server was unreachable — check it and reconnect.
              </p>
            )}
            {status === 'insecure' && !error && (
              <p className="text-destructive text-sm">{errorMessages.insecure}</p>
            )}
            <Button type="submit" disabled={submitting || !url.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Connect
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
