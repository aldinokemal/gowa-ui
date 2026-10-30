import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isApiError, toApiError, TransportGuardError } from './api-error'

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: {},
  } as AxiosResponse)
}

describe('toApiError', () => {
  it('extracts the gowa envelope from an axios error', () => {
    const error = toApiError(
      axiosErrorWithResponse(404, { code: 'DEVICE_NOT_FOUND', message: 'device not found' }),
    )
    expect(error).toEqual({ status: 404, code: 'DEVICE_NOT_FOUND', message: 'device not found' })
  })

  describe('cross-site block', () => {
    const blocked = () =>
      toApiError(
        axiosErrorWithResponse(403, {
          code: 'CROSS_SITE_REQUEST_BLOCKED',
          message: 'browser request origin is not allowed',
        }),
      )

    afterEach(() => vi.unstubAllGlobals())

    it('names the dashboard origin to trust', () => {
      vi.stubGlobal('location', { origin: 'https://ui.example.com' })
      expect(blocked()).toMatchObject({
        code: 'CROSS_SITE_REQUEST_BLOCKED',
        message:
          "browser request origin is not allowed — add https://ui.example.com to the server's APP_TRUSTED_ORIGINS",
      })
    })

    it('asks for an http(s) origin when opened from a file', () => {
      vi.stubGlobal('location', { origin: 'null' })
      expect(blocked().message).toBe(
        "browser request origin is not allowed — open this dashboard from an http(s) origin listed in the server's APP_TRUSTED_ORIGINS",
      )
    })
  })

  it('ignores non-string envelope fields', () => {
    const error = toApiError(axiosErrorWithResponse(500, { code: 7, message: { detail: 'x' } }))
    expect(error).toEqual({ status: 500, code: 'HTTP_ERROR', message: 'Request failed' })
  })

  it('maps a missing response to NETWORK_ERROR', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'))
    expect(error.status).toBe(0)
    expect(error.code).toBe('NETWORK_ERROR')
  })

  it('falls back to HTTP_ERROR when the body is not an envelope', () => {
    const error = toApiError(axiosErrorWithResponse(502, '<html>bad gateway</html>'))
    expect(error.status).toBe(502)
    expect(error.code).toBe('HTTP_ERROR')
  })

  it('passes ApiError objects through and wraps plain errors', () => {
    const passthrough = { status: 401, code: 'AUTHENTICATION_ERROR', message: 'nope' }
    expect(toApiError(passthrough)).toBe(passthrough)
    expect(isApiError(toApiError(new Error('boom')))).toBe(true)
    expect(toApiError(new Error('boom')).message).toBe('boom')
  })

  it('preserves transport guard codes', () => {
    const error = toApiError(
      new TransportGuardError(
        'INSECURE_TRANSPORT',
        'Refusing to send credentials over insecure HTTP',
      ),
    )
    expect(error).toEqual({
      status: 0,
      code: 'INSECURE_TRANSPORT',
      message: 'Refusing to send credentials over insecure HTTP',
    })
  })
})
