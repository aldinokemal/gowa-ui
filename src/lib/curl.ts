import { formFields, type ApiRequest } from '@/api/request'
import { joinUrl } from '@/lib/url'

const MASK = '••••••••'
const INDENT = '  '

export interface CurlOptions {
  baseUrl: string
  username?: string | null
  password?: string | null
  deviceId?: string | null
  /** False renders the password as a mask, for display on screen. */
  revealSecrets: boolean
}

/** Quote a value for a POSIX shell: close, escape, reopen around each quote. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * Render a request as a runnable curl command. Base URL, credentials and the
 * device header mirror what the axios interceptor attaches, so the command is
 * the request the UI would send.
 */
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
    // Indent the pretty-printed body to sit under -d. Only the printer's own
    // newlines match; newlines inside a value are already JSON-escaped.
    const body = JSON.stringify(request.json, null, 2).replaceAll('\n', `\n${INDENT}`)
    parts.push(`-d ${shellQuote(body)}`)
  }
  for (const [key, value] of formFields(request.form ?? {})) {
    if (value instanceof File) {
      // A browser never learns a picked file's path, so the name stands in for it.
      // Quote the name: curl's -F grammar treats ; , @ and < as syntax.
      parts.push(`-F ${shellQuote(`${key}=@${curlMultipartFilename(value.name)}`)}`)
    } else {
      // --form-string keeps a leading < or @ as text instead of a local file read.
      parts.push(`--form-string ${shellQuote(`${key}=${value}`)}`)
    }
  }
  return parts.join(` \\\n${INDENT}`)
}

/**
 * Quote a filename for curl's multipart grammar. Inside the quotes, a
 * backslash escapes the next character, so commas, semicolons, and quotes
 * stay part of the name.
 */
function curlMultipartFilename(filename: string): string {
  const escaped = filename
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')
  return `"${escaped}"`
}

/** True when the command carries a file placeholder the user must edit. */
export function hasFileField(request: ApiRequest): boolean {
  return formFields(request.form ?? {}).some(([, value]) => value instanceof File)
}
