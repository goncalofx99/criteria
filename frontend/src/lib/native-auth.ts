import { Capacitor, registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const NATIVE_CALLBACK_SCHEME = 'com.criteria.app'
export const NATIVE_REDIRECT_URL = `${NATIVE_CALLBACK_SCHEME}://auth/callback`

export function isNative() {
  return Capacitor.isNativePlatform()
}

export function platform(): 'ios' | 'android' | 'web' {
  const p = Capacitor.getPlatform()
  return p === 'ios' || p === 'android' ? p : 'web'
}

/**
 * Check if a Capacitor plugin is actually available at runtime.
 * When the WebView loads a remote URL, the native bridge may not inject plugins.
 */
function isPluginAvailable(name: string): boolean {
  return Capacitor.isPluginAvailable(name)
}

// ─── iOS: Sign in with Apple (native ASAuthorizationAppleIDProvider) ────────

interface AppleAuthResult {
  identityToken: string
  nonce: string
  user: string
  email: string
  fullName: { givenName?: string; familyName?: string }
}

interface AppleAuthBridgePlugin {
  signIn(): Promise<AppleAuthResult>
}

const AppleAuthBridge = registerPlugin<AppleAuthBridgePlugin>('AppleAuthBridge')

/**
 * iOS-only. Native Sign in with Apple via ASAuthorizationAppleIDProvider.
 * Returns a JWT identityToken + raw nonce; we hand both to Supabase which
 * verifies the JWT against Apple's public keys.
 */
export async function signInWithAppleNative(): Promise<void> {
  console.log('[CRITERIA] signInWithAppleNative — calling AppleAuthBridge.signIn')
  const result = await AppleAuthBridge.signIn()

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: result.identityToken,
    nonce: result.nonce,
  })
  if (error) throw error
}

// ─── Android: Google via Chrome Custom Tabs + intent-filter callback ────────

interface OAuthBridgePlugin {
  startSession(opts: { url: string; callbackScheme: string }): Promise<{ callbackUrl: string }>
}

const OAuthBridge = registerPlugin<OAuthBridgePlugin>('OAuthBridge')

export async function signInWithProviderNative(provider: Provider): Promise<void> {
  console.log('[CRITERIA] signInWithProviderNative — platform:', platform())

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('No OAuth URL returned')

  if (platform() === 'ios') {
    // iOS: route through ASWebAuthenticationSession (in-app sheet).
    const { callbackUrl } = await OAuthBridge.startSession({
      url: data.url,
      callbackScheme: NATIVE_CALLBACK_SCHEME,
    })
    await exchangeCallbackUrl(callbackUrl)
    return
  }

  // Android: open Chrome Custom Tab. The intent-filter on com.criteria.app://
  // will bring the app back and fire the appUrlOpen event via the native bridge.
  await Browser.open({ url: data.url })
}

async function exchangeCallbackUrl(callbackUrl: string) {
  const parsed = new URL(callbackUrl)
  const code = parsed.searchParams.get('code')
  const errorDescription = parsed.searchParams.get('error_description')
  if (errorDescription) throw new Error(errorDescription)
  if (!code) throw new Error('No authorization code in callback URL')
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
}

/**
 * Android-only deep-link listener that finishes the OAuth flow when the
 * Custom Tab redirects to com.criteria.app://auth/callback.
 */
export function registerDeepLinkHandler(
  onSession: () => void,
  onError?: (msg: string) => void,
) {
  if (!isNative()) return () => {}
  if (platform() !== 'android') return () => {}

  const subPromise = App.addListener('appUrlOpen', async ({ url }) => {
    try {
      await exchangeCallbackUrl(url)
      onSession()
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
