import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConnection, type TestResult } from '@/stores/connection'

const errorMessages: Record<Exclude<TestResult, 'ok'>, string> = {
  unauthorized: 'The server rejected these credentials (401).',
  'not-gowa': 'That URL answered, but it does not look like a gowa server.',
  unreachable: 'Could not reach the server. Check the URL and that gowa is running.',
}

export default function ConnectPage() {
  const navigate = useNavigate()
  const status = useConnection((state) => state.status)
  const storedUrl = useConnection((state) => state.baseUrl)
  const storedUser = useConnection((state) => state.username)
  const connect = useConnection((state) => state.connect)

  const [url, setUrl] = useState(
    storedUrl ?? (import.meta.env.VITE_DEFAULT_SERVER_URL as string | undefined) ?? '',
  )
  const [username, setUsername] = useState(storedUser ?? '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'connected') return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await connect(url, username || undefined, password || undefined)
    setSubmitting(false)
    if (result === 'ok') {
      navigate('/', { replace: true })
    } else {
      setError(errorMessages[result])
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Logo className="mb-2" />
          <CardTitle>Connect to your gowa server</CardTitle>
          <CardDescription>
            The server URL and optional basic-auth credentials are stored in this browser only.
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            {status === 'unauthorized' && !error && (
              <p className="text-sm text-destructive">
                The stored credentials were rejected — enter them again.
              </p>
            )}
            {status === 'unreachable' && !error && (
              <p className="text-sm text-muted-foreground">
                The stored server was unreachable — check it and reconnect.
              </p>
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
