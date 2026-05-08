import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { isNative, platform, signInWithAppleNative, signInWithProviderNative } from '@/lib/native-auth'
import { cn } from '@/lib/utils'

type Variant = 'landing' | 'compact'

interface Props {
  /** Visual treatment. `landing` = filled buttons on dark backgrounds, `compact` = outlined for the sign-in form. */
  variant?: Variant
  /** Called after a sign-in attempt succeeds locally (Supabase has the session). */
  onAuthenticated?: () => void
  /** Called on error so the parent can show a message. */
  onError?: (msg: string) => void
}

/**
 * Per-platform social auth buttons.
 *
 * - iOS native:   Sign in with Apple (native ASAuthorizationAppleIDProvider).
 * - Android native: Continue with Google (Chrome Custom Tabs + intent-filter).
 * - Web:           Both buttons (web OAuth via Supabase redirect).
 */
export function SocialAuthButtons({ variant = 'compact', onAuthenticated, onError }: Props) {
  const [appleLoading, setAppleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const showApple = isNative() ? platform() === 'ios' : true
  // Show Google on iOS (via ASWebAuthenticationSession in-app sheet) and Android (via Custom Tabs).
  const showGoogle = true

  async function handleApple() {
    setAppleLoading(true)
    try {
      if (isNative()) {
        await signInWithAppleNative()
        onAuthenticated?.()
      } else {
        // Web: use Supabase OAuth redirect (native bridge is not available on web)
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apple sign-in failed.'
      if (msg !== 'USER_CANCELLED') onError?.(msg)
      setAppleLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      if (isNative()) {
        await signInWithProviderNative('google')
        // iOS: ASWebAuthenticationSession returned synchronously and the PKCE code
        // has been exchanged — session is set, navigate now.
        // Android: Browser.open resolves immediately; the appUrlOpen deep link
        // listener in NativeAuthBridge will navigate when the redirect fires.
        if (platform() === 'ios') {
          onAuthenticated?.()
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.'
      if (msg !== 'USER_CANCELLED') onError?.(msg)
      setGoogleLoading(false)
    }
  }

  if (!showApple && !showGoogle) return null

  return (
    <div className="flex flex-col gap-3 w-full">
      {showApple && (
        <Button
          onClick={handleApple}
          disabled={appleLoading}
          className={cn(
            variant === 'landing'
              ? 'h-14 w-full rounded-xl bg-white text-black shadow-elevation-2 hover:bg-accent text-[15px] font-medium'
              : 'h-12 w-full rounded-xl border-border text-foreground text-[15px] font-medium',
          )}
          variant={variant === 'landing' ? 'default' : 'outline'}
        >
          {appleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <AppleIcon />}
          Continue with Apple
        </Button>
      )}

      {showGoogle && (
        <Button
          onClick={handleGoogle}
          disabled={googleLoading}
          className={cn(
            variant === 'landing'
              ? 'h-14 w-full rounded-xl bg-white text-foreground shadow-elevation-2 hover:bg-accent text-[15px] font-medium'
              : 'h-12 w-full rounded-xl border-border text-foreground text-[15px] font-medium',
          )}
          variant={variant === 'landing' ? 'default' : 'outline'}
        >
          {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>
      )}
    </div>
  )
}

function AppleIcon() {
  return (
    <svg className="mr-1 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.469 2.225-1.222 3.022-.806.852-2.117 1.51-3.205 1.43-.142-1.106.41-2.255 1.18-2.984.86-.823 2.281-1.43 3.247-1.468zM21 17.46c-.59 1.291-.871 1.872-1.625 3.013-1.05 1.586-2.532 3.566-4.367 3.583-1.628.014-2.046-1.046-4.255-1.034-2.21.012-2.668 1.052-4.297 1.038-1.835-.014-3.236-1.795-4.286-3.382C-.55 16.39-.866 11.087 1.024 8.252c1.337-2.005 3.45-3.179 5.434-3.179 2.02 0 3.292 1.097 4.96 1.097 1.62 0 2.605-1.099 4.943-1.099 1.766 0 3.638.954 4.972 2.604-4.37 2.371-3.659 8.567.667 9.785z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="mr-1 h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
