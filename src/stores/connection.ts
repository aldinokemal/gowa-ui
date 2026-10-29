import axios from 'axios'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ResponseData } from '@/api/types'
import { basicAuthHeader } from '@/lib/api-error'
import { discardPrivateCache } from '@/lib/query-client'
import { normalizeBaseUrl, refusesInsecureCredentials, sameOriginBaseUrl } from '@/lib/url'

export type ConnectionStatus =
  'booting' | 'unconfigured' | 'connected' | 'unauthorized' | 'unreachable' | 'insecure'

export type TestResult = 'ok' | 'unauthorized' | 'not-gowa' | 'unreachable' | 'insecure'

export interface ConnectionState {
  baseUrl: string | null
  username: string | null
  password: string | null
  /** Set when the operator accepts credential-bearing remote HTTP. */
  allowInsecureHttp: boolean
  /** Immutable id for this browser session with a server. Not a secret. */
  connectionId: string | null
  status: ConnectionStatus
  connect: (
    baseUrl: string,
    username?: string,
    password?: string,
    allowInsecureHttp?: boolean,
  ) => Promise<TestResult>
  boot: () => Promise<void>
  disconnect: () => void
  markUnauthorized: () => void
}

export function hasBasicCredentials(username?: string | null, password?: string | null): boolean {
  return Boolean(username && password)
}

const memoryStore = new Map<string, string>()

/** localStorage in the browser; a process-local map under Node tests. */
function connectionStorage() {
  if (typeof localStorage !== 'undefined') return localStorage
  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value)
    },
    removeItem: (key: string) => {
      memoryStore.delete(key)
    },
  }
}

/**
 * Probe a server without the shared axios instance (no interceptors, no
 * global 401 handling). Distinguishes a real gowa server from any web server
 * that happens to answer 200 (e.g. an SPA dev server echoing index.html).
 */
export async function probeServer(
  baseUrl: string,
  username?: string,
  password?: string,
): Promise<Exclude<TestResult, 'insecure'>> {
  try {
    const response = await axios.get<ResponseData<unknown>>(`${baseUrl}/devices`, {
      timeout: 8_000,
      validateStatus: () => true,
      headers: {
        Accept: 'application/json',
        ...(username && password ? { Authorization: basicAuthHeader(username, password) } : {}),
      },
    })
    if (response.status === 401) return 'unauthorized'
    const body = response.data
    if (response.status === 200 && typeof body === 'object' && body !== null && 'code' in body) {
      return 'ok'
    }
    return 'not-gowa'
  } catch {
    return 'unreachable'
  }
}

export const useConnection = create<ConnectionState>()(
  persist(
    (set, get) => {
      const adopt = (next: {
        baseUrl: string
        username: string | null
        password: string | null
        allowInsecureHttp: boolean
      }) => {
        // Cancel and drop the previous session before the new id is visible,
        // so a late response cannot be stored for the new connection.
        discardPrivateCache()
        set({
          ...next,
          connectionId: crypto.randomUUID(),
          status: 'connected',
        })
      }

      return {
        baseUrl: null,
        username: null,
        password: null,
        allowInsecureHttp: false,
        connectionId: null,
        status: 'booting',

        connect: async (rawUrl, username, password, allowInsecureHttp = false) => {
          const baseUrl = normalizeBaseUrl(rawUrl)
          const hasCredentials = hasBasicCredentials(username, password)
          if (refusesInsecureCredentials(baseUrl, hasCredentials, allowInsecureHttp)) {
            return 'insecure'
          }
          const result = await probeServer(baseUrl, username, password)
          if (result === 'ok') {
            adopt({
              baseUrl,
              username: username || null,
              password: password || null,
              allowInsecureHttp,
            })
          }
          return result
        },

        boot: async () => {
          const { baseUrl, username, password, allowInsecureHttp } = get()
          if (baseUrl) {
            const hasCredentials = hasBasicCredentials(username, password)
            if (refusesInsecureCredentials(baseUrl, hasCredentials, allowInsecureHttp)) {
              set({ status: 'insecure', connectionId: null })
              return
            }
            const stored = await probeServer(baseUrl, username ?? undefined, password ?? undefined)
            if (stored === 'ok') {
              adopt({
                baseUrl,
                username,
                password,
                allowInsecureHttp,
              })
              return
            }
            set({
              status: stored === 'unauthorized' ? 'unauthorized' : 'unreachable',
              connectionId: null,
            })
            return
          }
          // Zero-config: the page may be served by gowa itself. The browser
          // replays cached basic-auth credentials on same-origin requests.
          const origin = sameOriginBaseUrl()
          if ((await probeServer(origin)) === 'ok') {
            adopt({
              baseUrl: origin,
              username: null,
              password: null,
              allowInsecureHttp: false,
            })
            return
          }
          set({ status: 'unconfigured', connectionId: null })
        },

        disconnect: () => {
          discardPrivateCache()
          set({
            baseUrl: null,
            username: null,
            password: null,
            allowInsecureHttp: false,
            connectionId: null,
            status: 'unconfigured',
          })
        },

        markUnauthorized: () => {
          if (get().status === 'connected') set({ status: 'unauthorized' })
        },
      }
    },
    {
      name: 'gowa-ui.connection.v1',
      storage: createJSONStorage(() => connectionStorage()),
      partialize: ({ baseUrl, username, password, allowInsecureHttp }) => ({
        baseUrl,
        username,
        password,
        allowInsecureHttp,
      }),
    },
  ),
)
