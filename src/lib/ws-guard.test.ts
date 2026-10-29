import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWsStore, wsClient } from '@/lib/ws'
import { useConnection } from '@/stores/connection'

class FakeSocket {
  static opened: string[] = []
  constructor(url: string) {
    FakeSocket.opened.push(url)
  }
  close() {}
}

describe('websocket credential transport', () => {
  afterEach(() => {
    wsClient.stop()
    FakeSocket.opened = []
    vi.unstubAllGlobals()
    useConnection.setState({
      baseUrl: null,
      username: null,
      password: null,
      allowInsecureHttp: false,
      connectionId: null,
      status: 'unconfigured',
    })
  })

  it('does not open a credential-bearing remote ws connection unless insecure HTTP is allowed', () => {
    vi.stubGlobal('WebSocket', FakeSocket)
    useConnection.setState({
      status: 'connected',
      baseUrl: 'http://example.com',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'conn',
    })

    wsClient.sync()
    expect(FakeSocket.opened).toEqual([])
    expect(useWsStore.getState().status).toBe('disconnected')

    useConnection.setState({ allowInsecureHttp: true })
    wsClient.sync()
    expect(FakeSocket.opened).toHaveLength(1)
    expect(FakeSocket.opened[0]).toContain('ws://example.com/ws')
    expect(FakeSocket.opened[0]).toContain('authorization=')
  })

  it('opens wss for an https server', () => {
    vi.stubGlobal('WebSocket', FakeSocket)
    useConnection.setState({
      status: 'connected',
      baseUrl: 'https://wa.example.com',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'conn',
    })

    wsClient.sync()
    expect(FakeSocket.opened[0]?.startsWith('wss://wa.example.com/ws')).toBe(true)
  })
})
