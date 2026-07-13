import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deviceStatus, loginDeviceWithCode } from '@/api/devices'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toApiError } from '@/lib/api-error'
import type { RegistryDevice } from '@/api/types'

const STATUS_POLL_MS = 3_000

export function LoginCodeDialog({
  device,
  onOpenChange,
}: {
  device: RegistryDevice | null
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState('')
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const deviceId = device?.id ?? null
  const succeededRef = useRef(false)

  useEffect(() => {
    if (!deviceId) return
    succeededRef.current = false
    setPhone('')
    setPairCode(null)
    setCopied(false)
  }, [deviceId])

  useEffect(() => {
    if (!deviceId || !pairCode) return
    const poll = window.setInterval(() => {
      void deviceStatus(deviceId)
        .then((status) => {
          if (status.is_logged_in && !succeededRef.current) {
            succeededRef.current = true
            toast.success('Device paired successfully')
            void queryClient.invalidateQueries({ queryKey: ['devices'] })
            onOpenChange(false)
          }
        })
        .catch(() => undefined)
    }, STATUS_POLL_MS)
    return () => window.clearInterval(poll)
  }, [deviceId, pairCode, queryClient, onOpenChange])

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (!deviceId) return
      setSubmitting(true)
      try {
        const response = await loginDeviceWithCode(deviceId, phone.trim())
        setPairCode(response.pair_code)
      } catch (err) {
        toast.error(toApiError(err).message)
      } finally {
        setSubmitting(false)
      }
    },
    [deviceId, phone],
  )

  const copyCode = async () => {
    if (!pairCode) return
    await navigator.clipboard.writeText(pairCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2_000)
  }

  return (
    <Dialog open={device !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Login with pairing code</DialogTitle>
          <DialogDescription>
            WhatsApp → Linked devices → Link a device → Link with phone number instead
          </DialogDescription>
        </DialogHeader>
        {pairCode ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="font-mono text-3xl font-semibold tracking-widest">{pairCode}</p>
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Enter this code on your phone — waiting for pairing…
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pair-phone">Phone number (international format)</Label>
              <Input
                id="pair-phone"
                placeholder="628960561XXXX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting || !phone.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Get pairing code
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
