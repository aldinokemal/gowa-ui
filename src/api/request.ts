import { http, results } from '@/lib/http'

export type FormValue = string | number | boolean | File | number[]

/**
 * A request described rather than sent. Endpoints build one of these so the
 * same value can be executed and rendered as a shell command, which keeps the
 * two from drifting apart.
 */
export interface ApiRequest {
  method: 'POST'
  path: string
  json?: Record<string, unknown>
  form?: Record<string, FormValue | undefined | null>
}

/** Drop undefined/empty optional fields so the server sees only what was set. */
export function clean(payload: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === '') continue
    out[key] = value
  }
  return out
}

/** Fields that survive into the multipart body. Shared with the cURL renderer. */
export function formFields(form: NonNullable<ApiRequest['form']>): [string, FormValue][] {
  return Object.entries(form).filter(
    (entry): entry is [string, FormValue] =>
      entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
  )
}

function toFormData(form: NonNullable<ApiRequest['form']>): FormData {
  const data = new FormData()
  for (const [key, value] of formFields(form)) {
    if (Array.isArray(value)) {
      for (const item of value) data.append(key, String(item))
    } else {
      data.append(key, value instanceof File ? value : String(value))
    }
  }
  return data
}

/** Send a described request and unwrap the gowa envelope. */
export function exec<T>(request: ApiRequest): Promise<T> {
  const body = request.form ? toFormData(request.form) : request.json
  return results<T>(http.post(request.path, body))
}
