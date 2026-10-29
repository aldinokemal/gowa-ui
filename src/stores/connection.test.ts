import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/query-client'
import { useConnection } from '@/stores/connection'

const gowaOk = {
  status: 200,
  data: { code: 'SUCCESS', message: 'ok', results: [] },
}

function resetConnection() {
  useConnection.setState({
    baseUrl: null,
    username: null,
    password: null,
    allowInsecureHttp: false,
    connectionId: null,
    status: 'booting',
  })
  queryClient.clear()
}

describe('connection session', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetConnection()
  })

  it('does not probe a remote HTTP server when credentials would be sent in cleartext', async () => {
    const get = vi.spyOn(axios, 'get')
    const result = await useConnection.getState().connect('http://example.com', 'user', 'secret')
    expect(result).toBe('insecure')
    expect(get).not.toHaveBeenCalled()
    expect(useConnection.getState().status).not.toBe('connected')
  })

  it('probes remote HTTP only after the operator allows insecure credentials', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue(gowaOk)
    const result = await useConnection
      .getState()
      .connect('http://example.com', 'user', 'secret', true)
    expect(result).toBe('ok')
    expect(get).toHaveBeenCalledWith(
      'http://example.com/devices',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }),
      }),
    )
    expect(useConnection.getState().allowInsecureHttp).toBe(true)
    expect(useConnection.getState().connectionId).toEqual(expect.any(String))
  })

  it('defaults a scheme-less remote address to https before attaching credentials', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue(gowaOk)
    const result = await useConnection.getState().connect('wa.example.com', 'user', 'secret')
    expect(result).toBe('ok')
    expect(get).toHaveBeenCalledWith('https://wa.example.com/devices', expect.anything())
    expect(useConnection.getState().baseUrl).toBe('https://wa.example.com')
  })

  it('still allows credentials on loopback HTTP', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue(gowaOk)
    const result = await useConnection.getState().connect('http://127.0.0.1:3000', 'user', 'secret')
    expect(result).toBe('ok')
    expect(get).toHaveBeenCalled()
  })

  it('refuses a restored remote HTTP connection before probing', async () => {
    const get = vi.spyOn(axios, 'get')
    useConnection.setState({
      baseUrl: 'http://10.0.0.5:3000',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: null,
      status: 'booting',
    })
    await useConnection.getState().boot()
    expect(get).not.toHaveBeenCalled()
    expect(useConnection.getState().status).toBe('insecure')
    expect(useConnection.getState().password).toBe('secret')
  })

  it('drops cached private data when the connection changes', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue(gowaOk)
    queryClient.setQueryData(['devices', 'previous'], { webhook_secret: 'whsec_old' })
    useConnection.setState({
      baseUrl: 'https://a.example',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'previous',
      status: 'connected',
    })

    await useConnection.getState().connect('https://b.example', 'user', 'secret')

    expect(queryClient.getQueryData(['devices', 'previous'])).toBeUndefined()
    expect(useConnection.getState().connectionId).not.toBe('previous')
    expect(useConnection.getState().baseUrl).toBe('https://b.example')
  })

  it('clears credentials and private cache on disconnect', () => {
    queryClient.setQueryData(['chats', 'device', {}, 'conn-a'], [{ jid: 'secret' }])
    useConnection.setState({
      baseUrl: 'https://a.example',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: true,
      connectionId: 'conn-a',
      status: 'connected',
    })

    useConnection.getState().disconnect()

    expect(useConnection.getState()).toMatchObject({
      baseUrl: null,
      username: null,
      password: null,
      allowInsecureHttp: false,
      connectionId: null,
      status: 'unconfigured',
    })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('ignores a response that resolves after disconnect', async () => {
    let resolveQuery: (value: string) => void = () => {}
    const pending = new Promise<string>((resolve) => {
      resolveQuery = resolve
    })
    const fetch = queryClient.fetchQuery({
      queryKey: ['devices', 'conn-a'],
      queryFn: () => pending,
    })
    useConnection.setState({
      baseUrl: 'https://a.example',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'conn-a',
      status: 'connected',
    })

    useConnection.getState().disconnect()
    resolveQuery('secret chats')

    await expect(fetch).rejects.toBeTruthy()
    expect(queryClient.getQueryData(['devices', 'conn-a'])).toBeUndefined()
  })
})
