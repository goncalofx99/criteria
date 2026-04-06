import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/feed', { replace: true })
      else setCheckingSession(false)
    })
  }, [navigate])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      console.error(error)
      setGoogleLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-primary">
        <Loader2 className="h-7 w-7 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col bg-primary">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pt-safe">
        <h1 className="text-display font-bold tracking-[0.25em] text-white">
          CRITERIA
        </h1>
        <p className="mt-3 text-center text-base text-primary-400 leading-relaxed">
          The bidirectional real estate marketplace.
        </p>
        <p className="mt-1 text-center text-sm text-primary-400/60">
          Sellers find buyers. Buyers find sellers.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 px-6 pb-10 pb-safe">
        {/* Google */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="h-14 w-full rounded-xl bg-white text-foreground shadow-elevation-2 hover:bg-accent text-[15px] font-medium"
        >
          {googleLoading
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <GoogleIcon />
          }
          Continue with Google
        </Button>

        {/* Email sign up */}
        <Button
          asChild
          variant="outline"
          className="h-14 w-full rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15 text-[15px] font-medium"
        >
          <Link to="/sign-up">Create an account</Link>
        </Button>

        {/* Sign in link */}
        <p className="mt-1 text-center text-sm text-primary-400/70">
          Already have an account?{' '}
          <Link
            to="/sign-in"
            className="font-medium text-white underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="mr-1 h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
