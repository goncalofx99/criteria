import { Capacitor, registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { reviewMode } from '@/review/mode'
import { beginOAuthClientProof } from './oauthClientProof'

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
 * 2. After Google auth, server redirects to the native callback with a single-use code
 * 
 * iOS: Uses ASWebAuthenticationSession via OAuthBridge plugin
 * Android: Opens Chrome Custom Tab, deep link brings user back
 */
export async function signInWithGoogleNative(serverUrl: string): Promise<string | null> {
  if (reviewMode) throw new Error('Google OAuth is unavailable in local review mode')
  if (!serverUrl) throw new Error('Missing API URL for Google sign-in')
  const authUrl = new URL('/auth/google', serverUrl)
  authUrl.searchParams.set('redirect', `${NATIVE_CALLBACK_SCHEME}://auth/callback`)
  authUrl.searchParams.set('client_challenge', await beginOAuthClientProof())

  if (platform() === 'ios') {
    // iOS: ASWebAuthenticationSession returns the callback URL synchronously
    const { callbackUrl } = await OAuthBridge.startSession({
      url: authUrl.toString(),
      callbackScheme: NATIVE_CALLBACK_SCHEME,
    })
    return callbackUrl
  }

  // Android: open Chrome Custom Tab. The intent-filter on com.criteria.app://
  // will bring the app back and fire the appUrlOpen event via the native bridge.
  await Browser.open({ url: authUrl.toString() })
  return null // Android handles via deep link listener
}

/**
 * Parse the single-use code only from the registered native OAuth callback.
 */
export function parseCallbackCode(callbackUrl: string): string | null {
  try {
    const url = new URL(callbackUrl)
    if (url.protocol !== `${NATIVE_CALLBACK_SCHEME}:` || url.hostname !== 'auth' || url.pathname !== '/callback') return null
    return url.searchParams.get('code') || null
  } catch {
    return null
  }
}

/**
 * Android-only deep-link listener that finishes the OAuth flow when the
 * Custom Tab redirects to com.criteria.app://auth/callback.
 */
export function registerDeepLinkHandler(
  onCode: (code: string) => void | Promise<void>,
  onError?: (msg: string) => void,
) {
  if (!isNative()) return () => {}
  if (platform() !== 'android') return () => {}

  const subPromise = App.addListener('appUrlOpen', async ({ url }) => {
    try {
      const code = parseCallbackCode(url)
      if (code) {
        await onCode(code)
      } else {
        onError?.('No sign-in code in callback URL')
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
