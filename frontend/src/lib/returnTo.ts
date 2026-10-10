const AUTH_DESTINATION_KEY = 'criteria_auth_destination'

/** Navigation targets from URLs or history must stay inside this application. */
export function safeInternalPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function rememberAuthDestination(path: string): void {
  window.sessionStorage.setItem(AUTH_DESTINATION_KEY, safeInternalPath(path))
}

export function takeAuthDestination(fallback = '/'): string {
  const saved = window.sessionStorage.getItem(AUTH_DESTINATION_KEY)
  window.sessionStorage.removeItem(AUTH_DESTINATION_KEY)
  return safeInternalPath(saved, fallback)
}
