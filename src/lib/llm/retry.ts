const RETRYABLE = new Set([429, 500, 502, 503, 504])

/** fetch with small exponential backoff for transient provider errors (rate limit / overload). */
export async function fetchWithRetry(url: string, init: RequestInit, retries = 2, baseMs = 600): Promise<Response> {
  let res = await fetch(url, init)
  for (let i = 0; i < retries && RETRYABLE.has(res.status) && !init.signal?.aborted; i++) {
    await new Promise((r) => setTimeout(r, baseMs * 2 ** i))
    res = await fetch(url, init)
  }
  return res
}
