import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { passkeyConfirm } from '@/api/app'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toApiError } from '@/lib/api-error'
import { onWsEvent } from '@/lib/events'

interface PasskeyPrompt {
  deviceId: string
  code: string
}

export function PasskeyDialog() {
  const [prompt, setPrompt] = useState<PasskeyPrompt | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(
    () =>
      onWsEvent((event) => {
        if (event.code === 'PASSKEY_CONFIRMATION') {
          const result = event.result as { device_id?: string; code?: string } | null
          if (result?.device_id && result.code) {
            setPrompt({ deviceId: result.device_id, code: result.code })
          }
        }
        if (event.code === 'PASSKEY_ERROR') {
          toast.error(event.message || 'Passkey pairing failed')
          setPrompt(null)
        }
      }),
    [],
  )

  const confirm = async () => {
    if (!prompt) return
    setConfirming(true)
    try {
      await passkeyConfirm(prompt.deviceId)
      toast.success('Passkey confirmed')
      setPrompt(null)
    } catch (err) {
      toast.error(toApiError(err).message)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open={prompt !== null} onOpenChange={(open) => !open && setPrompt(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm passkey pairing</DialogTitle>
          <DialogDescription>
            Device {prompt?.deviceId} received a passkey request. Confirm only if the code below
            matches the one shown on your phone.
          </DialogDescription>
        </DialogHeader>
        <p className="py-2 text-center font-mono text-3xl font-semibold tracking-widest">
          {prompt?.code}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPrompt(null)}>
            Reject
          </Button>
          <Button onClick={confirm} disabled={confirming}>
            {confirming && <Loader2 className="size-4 animate-spin" />}
            Codes match — confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
