import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { ResponseData } from '@/api/types'
import { basicAuthHeader, toApiError } from '@/lib/api-error'
import { useConnection } from '@/stores/connection'
import { useDeviceStore } from '@/stores/device'

export const http: AxiosInstance = axios.create({ timeout: 45_000 })

http.interceptors.request.use((config) => {
  const { baseUrl, username, password } = useConnection.getState()
  config.baseURL = baseUrl ?? ''
  if (username && password && !config.headers.Authorization) {
    config.headers.Authorization = basicAuthHeader(username, password)
  }
  const deviceId = useDeviceStore.getState().selectedDeviceId
  if (deviceId && !config.headers['X-Device-Id']) {
    config.headers['X-Device-Id'] = encodeURIComponent(deviceId)
  }
  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
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
