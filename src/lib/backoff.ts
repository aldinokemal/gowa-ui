const MAX_DELAY_MS = 30_000

/** Exponential backoff with up to 20% jitter, capped at 30s. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(1_000 * 2 ** attempt, MAX_DELAY_MS)
  return Math.round(base + base * 0.2 * random())
}
