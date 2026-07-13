import { create } from 'zustand'
import { backoffDelay } from '@/lib/backoff'
import { emitWsEvent, type WsEvent } from '@/lib/events'
import { b64encode, toWebSocketUrl } from '@/lib/url'
import { useConnection } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'

export type WsStatus = 'disconnected' | 'connecting' | 'connected'

export const useWsStore = create<{ status: WsStatus }>(() => ({ status: 'disconnected' }))

class WsClient {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private attempt = 0
  private desired = false
  private url = ''

  /** Reconcile the socket with the current connection + device selection. */
  sync(): void {
    const { status, baseUrl, username, password } = useConnection.getState()
    const deviceId = useDeviceStore.getState().selectedDeviceId

    if (status !== 'connected' || !baseUrl) {
      this.stop()
      return
    }

    const url = toWebSocketUrl(baseUrl, {
      device_id: deviceId ?? '',
      authorization: username && password ? b64encode(`${username}:${password}`) : '',
    })
    if (url === this.url && this.desired) return

    this.url = url
    this.desired = true
    this.attempt = 0
    this.reopen()
  }

  stop(): void {
    this.desired = false
    this.url = ''
    this.clearTimer()
    this.closeSocket()
    useWsStore.setState({ status: 'disconnected' })
  }

  fetchDevices(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ code: 'FETCH_DEVICES' }))
    }
  }

  private reopen(): void {
    this.clearTimer()
    this.closeSocket()
    if (!this.desired) return

    useWsStore.setState({ status: 'connecting' })
    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.onopen = () => {
      if (socket !== this.socket) return
      this.attempt = 0
      useWsStore.setState({ status: 'connected' })
      this.fetchDevices()
    }

    socket.onmessage = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as WsEvent
        if (event && typeof event.code === 'string') emitWsEvent(event)
      } catch {
        // non-JSON frames are ignored
      }
    }

    socket.onclose = () => {
      if (socket !== this.socket) return
      this.socket = null
      if (!this.desired) return
      useWsStore.setState({ status: 'connecting' })
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    this.clearTimer()
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.reopen()
    }, backoffDelay(this.attempt++))
  }

  private clearTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private closeSocket(): void {
    if (this.socket) {
      const socket = this.socket
      this.socket = null
      socket.onopen = socket.onmessage = socket.onclose = null
      socket.close()
    }
  }
}

export const wsClient = new WsClient()
