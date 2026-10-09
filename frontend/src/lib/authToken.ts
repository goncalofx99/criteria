/** A short clock margin prevents sending tokens that expire during a request. */
export function tokenIsUsable(token: string, nowMs = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp * 1000 > nowMs + 30_000
  } catch { return false }
}
