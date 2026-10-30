import { AxiosError } from 'axios'
import type { ApiError, ResponseData } from '@/api/types'
import { b64encode } from '@/lib/url'

export type TransportGuardCode = 'STALE_CONNECTION' | 'INSECURE_TRANSPORT'

/** A request was stopped because it would cross connections or send credentials in cleartext. */
export class TransportGuardError extends Error {
  readonly status = 0
  readonly code: TransportGuardCode

  constructor(code: TransportGuardCode, message: string) {
    super(message)
    this.name = 'TransportGuardError'
    this.code = code
  }
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Error) &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  )
}

/** gowa rejects changes from browser origins it does not trust; say which setting fixes it. */
function crossSiteHint(): string {
  const origin = globalThis.location?.origin
  return origin?.startsWith('http')
    ? ` — add ${origin} to the server's APP_TRUSTED_ORIGINS`
    : " — open this dashboard from an http(s) origin listed in the server's APP_TRUSTED_ORIGINS"
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof TransportGuardError) {
    return { status: error.status, code: error.code, message: error.message }
  }
  // AxiosError first: axios v1 exposes status/code/message on the error
  // itself, which would satisfy the structural ApiError check.
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ResponseData<unknown>> | undefined
    // Bodies come from whatever answered (gowa, a proxy, a Blob download), so only
    // string fields count as the gowa envelope.
    const code =
      typeof data?.code === 'string' ? data.code : error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR'
    const message = typeof data?.message === 'string' ? data.message : error.message
    return {
      status: error.response?.status ?? 0,
      code,
      message: code === 'CROSS_SITE_REQUEST_BLOCKED' ? message + crossSiteHint() : message,
    }
  }
  if (isApiError(error)) return error
  return {
    status: 0,
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
  }
}

export function basicAuthHeader(username: string, password: string): string {
  return `Basic ${b64encode(`${username}:${password}`)}`
}
