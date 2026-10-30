import { useState } from 'react'
import { Check, Copy, Loader2, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiRequest } from '@/api/request'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { hasFileField, toCurl, type CurlOptions } from '@/lib/curl'
import { sameOriginBaseUrl } from '@/lib/url'
import { useConnection } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'

/** Connection details the command needs, mirroring the axios interceptor. */
function useCurlOptions(): Omit<CurlOptions, 'revealSecrets'> {
  const baseUrl = useConnection((state) => state.baseUrl)
  const username = useConnection((state) => state.username)
  const password = useConnection((state) => state.password)
  const deviceId = useDeviceStore((state) => state.selectedDeviceId)
  return { baseUrl: baseUrl ?? sameOriginBaseUrl(), username, password, deviceId }
}

function CurlDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ApiRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const options = useCurlOptions()
  const [copied, setCopied] = useState(false)

  // Only render while open: bodies can carry large base64 images.
  const masked = open ? toCurl(request, { ...options, revealSecrets: false }) : ''
  const secret = Boolean(options.username && options.password)

  const copy = async () => {
    await navigator.clipboard.writeText(toCurl(request, { ...options, revealSecrets: true }))
    setCopied(true)
    toast.success('cURL copied')
    window.setTimeout(() => setCopied(false), 2_000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            cURL for {request.method} {request.path}
          </DialogTitle>
          <DialogDescription>
            The same request this form sends. Run it anywhere curl is installed.
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-muted/50 max-h-80 overflow-auto rounded-lg border p-3 font-mono text-xs">
          {masked}
        </pre>
        {(secret || hasFileField(request)) && (
          <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
            {secret && <li>Your password is hidden here — the copied command contains it.</li>}
            {hasFileField(request) && <li>Replace the filename after @ with the path on disk.</li>}
          </ul>
        )}
        <DialogFooter showCloseButton>
          <Button onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Submit button plus a cURL preview of the request that button would send.
 * Both share `disabled`, so the command always matches a request that works.
 */
export function FormActions({
  submitLabel,
  pending,
  disabled,
  request,
}: {
  submitLabel: string
  pending: boolean
  disabled: boolean
  request: ApiRequest
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2 self-start">
      <Button type="submit" disabled={pending || disabled}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        <Terminal className="size-4" />
        cURL
      </Button>
      <CurlDialog request={request} open={open} onOpenChange={setOpen} />
    </div>
  )
}
