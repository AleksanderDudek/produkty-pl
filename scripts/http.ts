// Open Food Facts asks API clients to identify themselves.
export const USER_AGENT = 'produkty-pl/0.1 (personal local product browser)'

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** GET with one retry after a pause: these are public, occasionally slow APIs. */
export async function fetchWithRetry(url: string, attempts = 2): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (response.ok) return response
      lastError = new Error(`${response.status} ${response.statusText} for ${url}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < attempts) await sleep(2000)
  }
  throw lastError
}
