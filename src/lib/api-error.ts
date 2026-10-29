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

export function toApiError(error: unknown): ApiError {
  if (error instanceof TransportGuardError) {
    return { status: error.status, code: error.code, message: error.message }
  }
  // AxiosError first: axios v1 exposes status/code/message on the error
  // itself, which would satisfy the structural ApiError check.
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ResponseData<unknown>> | undefined
    return {
      status: error.response?.status ?? 0,
      code: data?.code ?? (error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
      message: data?.message ?? error.message,
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
