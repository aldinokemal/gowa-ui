import { formFields, type ApiRequest } from '@/api/request'
import { joinUrl } from '@/lib/url'

const MASK = '••••••••'
const INDENT = '  '

export interface CurlOptions {
  baseUrl: string
  username?: string | null
  password?: string | null
  deviceId?: string | null
  revealSecrets: boolean
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

export function toCurl(request: ApiRequest, opts: CurlOptions): string {
  const parts = [`curl -X ${request.method} ${shellQuote(joinUrl(opts.baseUrl, request.path))}`]

  if (opts.username && opts.password) {
    const password = opts.revealSecrets ? opts.password : MASK
    parts.push(`-u ${shellQuote(`${opts.username}:${password}`)}`)
  }
  if (opts.deviceId) {
    parts.push(`-H ${shellQuote(`X-Device-Id: ${encodeURIComponent(opts.deviceId)}`)}`)
  }
  if (request.json) {
    parts.push(`-H 'Content-Type: application/json'`)
    const body = JSON.stringify(request.json, null, 2).replaceAll('\n', `\n${INDENT}`)
    parts.push(`-d ${shellQuote(body)}`)
  }
  for (const [key, value] of formFields(request.form ?? {})) {
    if (value instanceof File) {
      // A browser never learns a picked file's path, so the name stands in for it.
      parts.push(`-F ${shellQuote(`${key}=@${curlMultipartFilename(value.name)}`)}`)
    } else {
      // --form-string keeps a leading < or @ as text instead of a local file read.
      parts.push(`--form-string ${shellQuote(`${key}=${value}`)}`)
    }
  }
  return parts.join(` \\\n${INDENT}`)
}

function curlMultipartFilename(filename: string): string {
  const escaped = filename.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  return `"${escaped}"`
}

export function hasFileField(request: ApiRequest): boolean {
  return formFields(request.form ?? {}).some(([, value]) => value instanceof File)
}
