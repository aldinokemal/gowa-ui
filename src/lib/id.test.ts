import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConnectionId } from './id'

describe('createConnectionId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'generated-uuid')
    const getRandomValues = vi.fn()
    vi.stubGlobal('crypto', { randomUUID, getRandomValues })

    expect(createConnectionId()).toBe('generated-uuid')
    expect(getRandomValues).not.toHaveBeenCalled()
  })

  it('falls back to getRandomValues on insecure origins', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index))
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(createConnectionId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
    expect(getRandomValues).toHaveBeenCalledOnce()
  })
})
