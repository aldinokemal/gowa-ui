import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { ResponseData } from '@/api/types'
import { basicAuthHeader, toApiError, TransportGuardError } from '@/lib/api-error'
import { hasBasicCredentials, useConnection } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'
import { refusesInsecureCredentials } from '@/lib/url'

export const http = axios.create({ timeout: 45_000 })

type GuardedConfig = InternalAxiosRequestConfig & { gowaConnectionId?: string | null }

http.interceptors.request.use(
  (config) => {
    const { baseUrl, username, password, allowInsecureHttp, connectionId } =
      useConnection.getState()
    const hasCredentials = hasBasicCredentials(username, password)
    if (baseUrl && refusesInsecureCredentials(baseUrl, hasCredentials, allowInsecureHttp)) {
      throw new TransportGuardError(
        'INSECURE_TRANSPORT',
        'Refusing to send credentials over insecure HTTP',
      )
    }
    const guarded = config as GuardedConfig
    guarded.baseURL = baseUrl ?? ''
    guarded.gowaConnectionId = connectionId
    if (username && password && !guarded.headers.Authorization) {
      guarded.headers.Authorization = basicAuthHeader(username, password)
    }
    const deviceId = useDeviceStore.getState().selectedDeviceId
    if (deviceId && !guarded.headers['X-Device-Id']) {
      guarded.headers['X-Device-Id'] = encodeURIComponent(deviceId)
    }
    return guarded
  },
  (error: unknown) => {
    throw error
  },
  { synchronous: true },
)

http.interceptors.response.use(
  (response: AxiosResponse) => {
    const sentAs = (response.config as GuardedConfig).gowaConnectionId
    if (sentAs !== useConnection.getState().connectionId) {
      return Promise.reject(
        new TransportGuardError(
          'STALE_CONNECTION',
          'Connection changed before the response arrived',
        ),
      )
    }
    return response
  },
  async (error: unknown) => {
    if (error instanceof TransportGuardError) return Promise.reject(error)
    // File downloads ask for a Blob, so gowa's JSON error envelope arrives as one too.
    if (error instanceof AxiosError && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        // Not JSON (e.g. Basic Auth's plain "Unauthorized"); the status still applies.
      }
    }
    const apiError = toApiError(error)
    if (apiError.status === 401) {
      useConnection.getState().markUnauthorized()
    }
    return Promise.reject(apiError)
  },
)

/** Unwrap the gowa envelope {code, message, results}. */
export async function results<T>(request: Promise<AxiosResponse<ResponseData<T>>>): Promise<T> {
  const response = await request
  return response.data.results as T
}

export async function envelope<T>(
  request: Promise<AxiosResponse<ResponseData<T>>>,
): Promise<ResponseData<T>> {
  const response = await request
  return response.data
}
