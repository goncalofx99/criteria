import { reviewMode } from './mode'

export function shouldBlockReviewRequest(method: string, url: URL, backendUrls: URL[]): boolean {
  if (method !== 'GET' && method !== 'HEAD') return true
  return backendUrls.some(base => url.origin === base.origin && url.pathname.startsWith(base.pathname.replace(/\/$/, '')))
}

/** Defense in depth: future fetch calls cannot write while fixtures are active. */
export function installReviewNetworkGuard() {
  if (!reviewMode || typeof window === 'undefined') return
  const originalFetch = window.fetch.bind(window)
  const backendUrls = [import.meta.env.VITE_API_URL, import.meta.env.VITE_GRAPHQL_URL]
    .filter((value): value is string => !!value)
    .map(value => new URL(value, window.location.href))

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const rawUrl = input instanceof Request ? input.url : input.toString()
    const url = new URL(rawUrl, window.location.href)
    if (shouldBlockReviewRequest(method, url, backendUrls)) {
      return Promise.reject(new Error('Network request blocked in local review mode'))
    }
    return originalFetch(input, init)
  }
}
