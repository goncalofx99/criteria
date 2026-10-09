import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { hasValidSession } from '@/lib/auth'
import { warmUpBackend } from '@/lib/warmup'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, Building2, Loader2, Search } from 'lucide-react'
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
    <div className="landing-layout app-shell min-h-dvh bg-primary-900">
      <div className="landing-hero relative flex min-h-[55dvh] flex-col justify-between overflow-hidden px-7 pb-10 pt-safe md:px-12 md:pb-12 lg:px-16">
        <div className="relative z-10 flex items-center gap-3 pt-6 text-white">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] border border-white/25 bg-white/10"><img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" /></span>
          <span className="font-semibold tracking-[.16em]">CRITERIA</span>
        </div>
        <div className="absolute -right-28 top-1/4 h-[460px] w-[460px] rounded-full border border-white/10 md:-right-12" />
        <div className="absolute -right-9 top-1/3 h-[340px] w-[340px] rounded-full border border-white/15" />
        <div className="relative z-10 max-w-[650px] pt-16">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary-400">Real estate, in both directions</p>
          <h1 className="landing-headline mt-5 font-semibold leading-[.98] tracking-[-.065em] text-white">
            Find a home.<br />Find your buyer.
          </h1>
          <p className="mt-6 max-w-[470px] text-sm leading-relaxed text-primary-200 md:text-base">
            List a property or share exactly what you’re looking for. The right people can discover each other here.
          </p>
        </div>
        <div className="landing-side-notes relative z-10 mt-10 max-w-lg grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <Building2 size={21} className="text-primary-400" />
            <p className="mt-4 text-sm font-semibold text-white">Have a property?</p>
            <p className="mt-1 text-xs leading-relaxed text-primary-200">Show it to people searching for a place like yours.</p>
          </div>
          <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <Search size={21} className="text-primary-400" />
            <p className="mt-4 text-sm font-semibold text-white">Looking to buy?</p>
            <p className="mt-1 text-xs leading-relaxed text-primary-200">Make your criteria visible to sellers.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center rounded-t-[30px] bg-accent px-6 pb-10 pt-10 pb-safe md:rounded-none md:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-[430px] flex-col gap-3">
          <p className="editorial-kicker">Welcome to a better search</p>
          <h2 className="mt-1 text-[34px] font-semibold leading-tight tracking-[-.05em] text-foreground">Your next move starts here.</h2>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">Join the marketplace where buyers and sellers can both make the first move.</p>
          <SocialAuthButtons
            variant="landing"
            onError={setError}
          />

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-center text-sm text-destructive animate-fade-in">
              {error}
            </p>
          )}

          {/* Email sign up */}
          <Button
            asChild
            className="h-14 w-full bg-primary text-[15px] font-semibold text-white hover:bg-primary-700"
          >
            <Link to="/sign-up">Create an account <ArrowUpRight size={17} /></Link>
          </Button>

          {/* Sign in link */}
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/sign-in"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
