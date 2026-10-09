export const NATIVE_OAUTH_CALLBACK = 'com.criteria.app://auth/callback'

/** OAuth can return only to the configured web callback or the app deep link. */
export function resolveOAuthRedirect(frontendUrl: string, requested?: string): string | null {
  const webCallback = new URL('/auth/callback', frontendUrl).toString()
  if (!requested) return webCallback
  if (requested === NATIVE_OAUTH_CALLBACK || requested === webCallback) return requested
  return null
}
