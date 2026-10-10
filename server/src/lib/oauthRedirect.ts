export const NATIVE_OAUTH_CALLBACK = 'com.criteria.app://auth/callback'

/** The exact API callback registered in the Google OAuth web client. */
export function googleOAuthCallbackUrl(port: number, production: boolean, publicApiUrl?: string): string {
  const apiOrigin = publicApiUrl
    ? new URL(publicApiUrl).origin
    : production ? 'https://criteria-newn.onrender.com' : `http://localhost:${port}`
  return new URL('/auth/google/callback', apiOrigin).toString()
}

/** OAuth can return only to the configured web callback or the app deep link.
 * Local development may use either loopback hostname on the configured port. */
export function resolveOAuthRedirect(frontendUrl: string, requested?: string, allowLocalAlias = false): string | null {
  const webCallback = new URL('/auth/callback', frontendUrl).toString()
  if (!requested) return webCallback
  if (requested === NATIVE_OAUTH_CALLBACK || requested === webCallback) return requested

  if (allowLocalAlias) {
    const configured = new URL(frontendUrl)
    if (configured.protocol === 'http:' && !configured.username && !configured.password &&
      (configured.hostname === 'localhost' || configured.hostname === '127.0.0.1')) {
      const alias = new URL(webCallback)
      alias.hostname = configured.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
      if (requested === alias.toString()) return requested
    }
  }
  return null
}
