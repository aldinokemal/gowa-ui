import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { listDevices } from '@/api/devices'
import { TransportGuardError } from '@/lib/api-error'
import { http } from '@/lib/http'
import { useConnection } from '@/stores/connection'

function jsonResponse(config: InternalAxiosRequestConfig, results: unknown): AxiosResponse {
  return {
    data: { code: 'SUCCESS', message: 'ok', results },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}

describe('credential transport on ordinary requests', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    useConnection.setState({
      baseUrl: null,
      username: null,
      password: null,
      allowInsecureHttp: false,
      connectionId: null,
      status: 'booting',
    })
  })

  it('does not send credentials to a remote HTTP server', async () => {
    let called = false
    const adapter: AxiosAdapter = async (config) => {
      called = true
      return jsonResponse(config, [])
    }
    http.defaults.adapter = adapter
    useConnection.setState({
      status: 'connected',
      baseUrl: 'http://example.com',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'conn',
    })

    await expect(listDevices()).rejects.toBeInstanceOf(TransportGuardError)
    await expect(listDevices()).rejects.toMatchObject({ code: 'INSECURE_TRANSPORT' })
    expect(called).toBe(false)
  })

  it('sends credentials to loopback HTTP and to remote HTTP when allowed', async () => {
    const seen: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      const authorization = config.headers?.Authorization ?? config.headers?.get?.('Authorization')
      seen.push(`${config.baseURL ?? ''} ${String(authorization ?? '')}`)
      return jsonResponse(config, [])
    }
    http.defaults.adapter = adapter

    useConnection.setState({
      status: 'connected',
      baseUrl: 'http://127.0.0.1:3000',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'conn',
    })
    await listDevices()

    useConnection.setState({
      baseUrl: 'http://example.com',
      allowInsecureHttp: true,
    })
    await listDevices()

    expect(seen[0]).toContain('http://127.0.0.1:3000')
    expect(seen[0]).toContain('Basic ')
    expect(seen[1]).toContain('http://example.com')
    expect(seen[1]).toContain('Basic ')
  })

  it('drops a response that arrives after the connection id changes', async () => {
    const adapter: AxiosAdapter = async (config) => {
      useConnection.setState({ connectionId: 'next' })
      return jsonResponse(config, [{ id: 'secret-device' }])
    }
    http.defaults.adapter = adapter
    useConnection.setState({
      status: 'connected',
      baseUrl: 'https://a.example',
      username: 'user',
      password: 'secret',
      allowInsecureHttp: false,
      connectionId: 'first',
    })

    await expect(listDevices()).rejects.toMatchObject({ code: 'STALE_CONNECTION' })
  })
})
