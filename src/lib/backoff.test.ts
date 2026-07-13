import { describe, expect, it } from 'vitest'
import { backoffDelay } from './backoff'

describe('backoffDelay', () => {
  it('doubles per attempt without jitter', () => {
    const noJitter = () => 0
    expect(backoffDelay(0, noJitter)).toBe(1_000)
    expect(backoffDelay(1, noJitter)).toBe(2_000)
    expect(backoffDelay(3, noJitter)).toBe(8_000)
  })

  it('caps at 30s', () => {
    expect(backoffDelay(10, () => 0)).toBe(30_000)
  })

  it('adds at most 20% jitter', () => {
    expect(backoffDelay(0, () => 1)).toBe(1_200)
    expect(backoffDelay(10, () => 1)).toBe(36_000)
  })
})
