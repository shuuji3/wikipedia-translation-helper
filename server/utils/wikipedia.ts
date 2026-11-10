interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

// Serialize outbound Wikipedia requests so bursts cannot trigger rate limits.
const MIN_INTERVAL_MS = 50
const MAX_RETRIES = 3
let lastRequestAt = 0
let requestQueue: Promise<unknown> = Promise.resolve()

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Returns a cached value if it has not expired. */
export function getCachedValue<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.value as T
}

/** Stores a value in the in-memory cache. */
export function setCachedValue<T>(key: string, value: T, ttlMs = 60 * 60 * 1000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

async function runWithInterval<T>(fn: () => Promise<T>): Promise<T> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  return fn()
}

/**
 * Fetches from Wikipedia through a shared queue with spacing and retry/backoff
 * on 429/503 so concurrent callers cannot exhaust the API rate limit.
 */
export function throttledWikiFetch<T>(url: string, options: any = {}): Promise<T> {
  const execute = async (): Promise<T> => {
    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await runWithInterval(() => $fetch<T>(url, options))
      } catch (error: any) {
        lastError = error
        const status = error?.response?.status
        if (status !== 429 && status !== 503) throw error
        await sleep(500 * 2 ** attempt)
      }
    }
    throw lastError
  }

  const result = requestQueue.then(execute, execute)
  requestQueue = result.catch(() => undefined)
  return result
}
