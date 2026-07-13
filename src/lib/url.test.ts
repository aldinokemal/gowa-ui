import { describe, expect, it } from 'vitest'
import { b64encode, joinUrl, normalizeBaseUrl, rerootServerUrl, toWebSocketUrl } from './url'

describe('normalizeBaseUrl', () => {
  it('adds http:// when the scheme is missing', () => {
    expect(normalizeBaseUrl('localhost:3000')).toBe('http://localhost:3000')
  })

  it('keeps https and strips trailing slashes', () => {
    expect(normalizeBaseUrl('https://wa.example.com/base///')).toBe('https://wa.example.com/base')
  })
})

describe('joinUrl', () => {
  it('joins without duplicating slashes', () => {
    expect(joinUrl('http://a/', '/b/c')).toBe('http://a/b/c')
    expect(joinUrl('http://a', 'b')).toBe('http://a/b')
  })
})

describe('rerootServerUrl', () => {
  it('replaces a wrong host with the configured base URL', () => {
    expect(
      rerootServerUrl('http://localhost:3000', 'http://0.0.0.0:3000/statics/qrcode/x.png'),
    ).toBe('http://localhost:3000/statics/qrcode/x.png')
  })

  it('keeps a client-side proxy prefix', () => {
    expect(
      rerootServerUrl('http://localhost:5173/gowa', 'http://internal:3000/statics/q.png'),
    ).toBe('http://localhost:5173/gowa/statics/q.png')
  })

  it('strips the server base path before joining', () => {
    expect(
      rerootServerUrl('https://api.example.com/wa', 'http://pod:3000/wa/statics/q.png', '/wa'),
    ).toBe('https://api.example.com/wa/statics/q.png')
  })
})

describe('toWebSocketUrl', () => {
  it('swaps scheme and appends params', () => {
    const url = new URL(
      toWebSocketUrl('https://api.example.com/wa', {
        device_id: 'device 1',
        authorization: 'dXNlcjpwYXNz',
      }),
    )
    expect(url.protocol).toBe('wss:')
    expect(url.pathname).toBe('/wa/ws')
    expect(url.searchParams.get('device_id')).toBe('device 1')
    expect(url.searchParams.get('authorization')).toBe('dXNlcjpwYXNz')
  })

  it('omits empty params and uses ws for http', () => {
    const url = new URL(toWebSocketUrl('http://localhost:3000', { device_id: '', authorization: '' }))
    expect(url.protocol).toBe('ws:')
    expect(url.pathname).toBe('/ws')
    expect([...url.searchParams.keys()]).toHaveLength(0)
  })
})

describe('b64encode', () => {
  it('matches btoa for ascii', () => {
    expect(b64encode('user:pass')).toBe(btoa('user:pass'))
  })

  it('handles non-ascii credentials (utf-8 roundtrip)', () => {
    const encoded = b64encode('üser:pässword')
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe('üser:pässword')
  })
})
