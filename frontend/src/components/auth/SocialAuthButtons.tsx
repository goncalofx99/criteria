import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startGoogleOAuth } from '@/lib/auth'
import { isNative, platform, signInWithGoogleNative, parseCallbackTokens } from '@/lib/native-auth'
import { cn } from '@/lib/utils'

type Variant = 'landing' | 'compact'

interface Props {
  variant?: Variant
  onAuthenticated?: (tokens?: { accessToken: string; refreshToken: string }) => void
  onError?: (msg: string) => void
}

const API_URL = import.meta.env.VITE_API_URL

export function SocialAuthButtons({ variant = 'compact', onAuthenticated, onError }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      if (isNative()) {
        const callbackUrl = await signInWithGoogleNative(API_URL)

        if (platform() === 'ios' && callbackUrl) {
          // iOS: ASWebAuthenticationSession returned synchronously
          const tokens = parseCallbackTokens(callbackUrl)
          if (tokens) {
            onAuthenticated?.(tokens)
          } else {
            onError?.('Failed to parse authentication tokens')
          }
        }
        // Android: Browser.open resolves immediately; the appUrlOpen deep link
        // listener in NativeAuthBridge will handle the callback.
      } else {
        // Web: redirect to server's Google OAuth endpoint
        startGoogleOAuth(`${window.location.origin}/auth/callback`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.'
      if (msg !== 'USER_CANCELLED') onError?.(msg)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
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
    </div>
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
