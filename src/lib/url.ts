export function normalizeBaseUrl(input: string): string {
  let url = input.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  return url.replace(/\/+$/, '')
}

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

/**
 * Re-root an absolute URL returned by the server (e.g. qr_link) onto the
 * configured base URL. The server builds such URLs from the Host header, which
 * is wrong behind proxies, and they never include a client-side prefix like
 * the /gowa dev proxy. serverBasePath is APP_BASE_PATH as reported by
 * GET /app/info; it is stripped before joining because the base URL already
 * points at the server root.
 */
export function rerootServerUrl(baseUrl: string, serverUrl: string, serverBasePath = ''): string {
  let path: string
  try {
    const parsed = new URL(serverUrl)
    path = parsed.pathname + parsed.search
  } catch {
    path = serverUrl
  }
  if (serverBasePath && path.startsWith(serverBasePath)) {
    path = path.slice(serverBasePath.length)
  }
  return joinUrl(baseUrl, path)
}

export function toWebSocketUrl(baseUrl: string, params: Record<string, string>): string {
  const httpUrl = new URL(joinUrl(baseUrl, 'ws'))
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  for (const [key, value] of Object.entries(params)) {
    if (value) httpUrl.searchParams.set(key, value)
  }
  return httpUrl.toString()
}

/** Base URL of the page itself, for the backend-served zero-config mode. */
export function sameOriginBaseUrl(): string {
  const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return `${window.location.origin}${path}`
}

export function b64encode(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
}
