import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { hasValidSession } from '@/lib/auth'
import { warmUpBackend } from '@/lib/warmup'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'

export default function LandingPage() {
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    warmUpBackend()
    hasValidSession().then((valid) => {
      if (valid) navigate('/feed', { replace: true })
      else setCheckingSession(false)
    })
  }, [navigate])

  if (checkingSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-primary">
        <Loader2 className="h-7 w-7 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col bg-primary md:grid md:grid-cols-2 md:items-center md:gap-12 md:px-12 md:py-16">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pt-safe md:items-start md:px-0 md:pt-0">
        <div className="md:max-w-lg md:text-left text-center">
          <h1 className="text-display font-bold tracking-[0.25em] text-white md:text-6xl lg:text-7xl">
            CRITERIA
          </h1>
          <p className="mt-3 text-base text-primary-400 leading-relaxed md:mt-6 md:text-lg">
            The bidirectional real estate marketplace.
          </p>
          <p className="mt-1 text-sm text-primary-400/60 md:text-base">
            Sellers find buyers. Buyers find sellers.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 px-6 pb-10 pb-safe md:px-0 md:pb-0">
        <div className="web-content flex flex-col gap-3">
          <SocialAuthButtons
            variant="landing"
            onError={setError}
          />

          {error && (
            <p className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm text-white animate-fade-in">
              {error}
            </p>
          )}

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
    </div>
  )
}
