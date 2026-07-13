import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deviceStatus, loginDevice } from '@/api/devices'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppInfo } from '@/hooks/use-app-info'
import { toApiError } from '@/lib/api-error'
import { onWsEvent } from '@/lib/events'
import { rerootServerUrl } from '@/lib/url'
import { useConnection } from '@/stores/connection'
import type { LoginQr, RegistryDevice } from '@/api/types'

const STATUS_POLL_MS = 3_000

export function LoginQrDialog({
  device,
  onOpenChange,
}: {
  device: RegistryDevice | null
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const baseUrl = useConnection((state) => state.baseUrl)
  const { data: info } = useAppInfo()
  const [qr, setQr] = useState<LoginQr | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const deviceId = device?.id ?? null
  const succeededRef = useRef(false)

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const succeed = useCallback(() => {
    if (succeededRef.current) return
    succeededRef.current = true
    toast.success('Device paired successfully')
    void queryClient.invalidateQueries({ queryKey: ['devices'] })
    close()
  }, [queryClient, close])

  const requestQr = useCallback(async (id: string) => {
    setError(null)
    try {
      const response = await loginDevice(id)
      setQr(response)
      setSecondsLeft(Math.max(1, Math.round(response.qr_duration)))
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.code === 'ALREADY_LOGGED_IN') {
        setError('This device is already logged in.')
      } else {
        setError(apiError.message)
      }
    }
  }, [])

  useEffect(() => {
    if (!deviceId) return
    succeededRef.current = false
    setQr(null)
    void requestQr(deviceId)

    const poll = window.setInterval(() => {
      void deviceStatus(deviceId)
        .then((status) => {
          if (status.is_logged_in) succeed()
        })
        .catch(() => undefined)
    }, STATUS_POLL_MS)

    const offLogin = onWsEvent((event) => {
      if (event.code !== 'LOGIN_SUCCESS') return
      void deviceStatus(deviceId)
        .then((status) => {
          if (status.is_logged_in) succeed()
        })
        .catch(() => undefined)
    })

    return () => {
      window.clearInterval(poll)
      offLogin()
    }
  }, [deviceId, requestQr, succeed])

  useEffect(() => {
    if (!deviceId || !qr) return
    const timer = window.setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          void requestQr(deviceId)
          return 0
        }
        return seconds - 1
      })
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [deviceId, qr, requestQr])

  const qrSrc = useMemo(() => {
    if (!qr || !baseUrl) return null
    return rerootServerUrl(baseUrl, qr.qr_link, info?.base_path ?? '')
  }, [qr, baseUrl, info?.base_path])

  return (
    <Dialog open={device !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan QR code</DialogTitle>
          <DialogDescription>
            WhatsApp → Settings → Linked devices → Link a device
            {device ? ` — pairing ${device.display_name || device.id}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : qrSrc ? (
            <>
              <img
                src={qrSrc}
                alt="WhatsApp pairing QR code"
                className="size-64 rounded-md bg-white p-2"
              />
              <p className="text-sm text-muted-foreground">
                Refreshes in {secondsLeft}s — waiting for scan…
              </p>
            </>
          ) : (
            <div className="flex size-64 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
