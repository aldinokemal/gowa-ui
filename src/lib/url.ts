export function normalizeBaseUrl(input: string): string {
  let url = input.trim()
  if (!url) return ''
  // Scheme-less addresses are remote until proven otherwise, so they use HTTPS.
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url.replace(/\/+$/, '')
}

/** True for names that resolve to the local machine rather than a network host. */
export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true
  if (!host.startsWith('127.')) return false
  const parts = host.split('.')
  return parts.length >= 2 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** True when the URL is HTTP or WS to a host other than loopback. */
export function isRemoteInsecureHttp(baseUrl: string): boolean {
  if (!baseUrl) return false
  try {
    const url = new URL(baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'ws:') return false
    return !isLoopbackHostname(url.hostname)
  } catch {
    return false
  }
}

/**
 * Credentials must not ride a remote cleartext connection unless the operator
 * opts in. Loopback HTTP stays allowed so a local gowa server can be used.
 */
export function refusesInsecureCredentials(
  baseUrl: string,
  hasCredentials: boolean,
  allowInsecureHttp: boolean,
): boolean {
  if (allowInsecureHttp) return false
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return hasCredentials
  }
  const embedded = Boolean(url.username || url.password)
  if (!hasCredentials && !embedded) return false
  if (url.protocol === 'https:' || url.protocol === 'wss:') return false
  if (url.protocol !== 'http:' && url.protocol !== 'ws:') return true
  return !isLoopbackHostname(url.hostname)
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
