import { AxiosError } from 'axios'
import type { ApiError, ResponseData } from '@/api/types'
import { b64encode } from '@/lib/url'

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
