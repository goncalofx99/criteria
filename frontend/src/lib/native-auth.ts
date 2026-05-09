import { Capacitor, registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'

export const NATIVE_CALLBACK_SCHEME = 'com.criteria.app'

export function isNative() {
  return Capacitor.isNativePlatform()
}

export function platform(): 'ios' | 'android' | 'web' {
  const p = Capacitor.getPlatform()
  return p === 'ios' || p === 'android' ? p : 'web'
}

// ─── iOS: OAuth via ASWebAuthenticationSession ────────────────────────────────

interface OAuthBridgePlugin {
  startSession(opts: { url: string; callbackScheme: string }): Promise<{ callbackUrl: string }>
}

const OAuthBridge = registerPlugin<OAuthBridgePlugin>('OAuthBridge')

/**
 * Start Google OAuth on native platforms.
 * 
 * The flow:
 * 1. Open the server's /auth/google endpoint (which redirects to Google consent)
 * 2. After Google auth, server redirects to frontend /auth/callback with tokens
 * 
 * iOS: Uses ASWebAuthenticationSession via OAuthBridge plugin
 * Android: Opens Chrome Custom Tab, deep link brings user back
 */
export async function signInWithGoogleNative(serverUrl: string): Promise<string | null> {
  const authUrl = `${serverUrl}/auth/google?redirect=${NATIVE_CALLBACK_SCHEME}://auth/callback`

  if (platform() === 'ios') {
    // iOS: ASWebAuthenticationSession returns the callback URL synchronously
    const { callbackUrl } = await OAuthBridge.startSession({
      url: authUrl,
      callbackScheme: NATIVE_CALLBACK_SCHEME,
    })
    return callbackUrl
  }

  // Android: open Chrome Custom Tab. The intent-filter on com.criteria.app://
  // will bring the app back and fire the appUrlOpen event via the native bridge.
  await Browser.open({ url: authUrl })
  return null // Android handles via deep link listener
}

/**
 * Parse tokens from a callback URL (native OAuth).
 * Returns { accessToken, refreshToken } or null if not found.
 */
export function parseCallbackTokens(callbackUrl: string): { accessToken: string; refreshToken: string } | null {
  try {
    const url = new URL(callbackUrl)
    const accessToken = url.searchParams.get('access_token')
    const refreshToken = url.searchParams.get('refresh_token')
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Android-only deep-link listener that finishes the OAuth flow when the
 * Custom Tab redirects to com.criteria.app://auth/callback.
 */
export function registerDeepLinkHandler(
  onTokens: (tokens: { accessToken: string; refreshToken: string }) => void,
  onError?: (msg: string) => void,
) {
  if (!isNative()) return () => {}
  if (platform() !== 'android') return () => {}

  const subPromise = App.addListener('appUrlOpen', async ({ url }) => {
    try {
      const tokens = parseCallbackTokens(url)
      if (tokens) {
        onTokens(tokens)
      } else {
        onError?.('No tokens in callback URL')
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      await Browser.close().catch(() => {})
    }
  })

  return () => {
    subPromise.then((s) => s.remove()).catch(() => {})
  }
}
