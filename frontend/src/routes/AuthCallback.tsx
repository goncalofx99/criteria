import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apolloClient } from '@/lib/apollo'
import { Loader2 } from 'lucide-react'
import { handleOAuthCallback, getAccessToken } from '@/lib/auth'
import { GET_ME } from '@/lib/gql'
import { takeAuthDestination } from '@/lib/returnTo'

export default function AuthCallback() {
  const navigate = useNavigate()
  const called = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (called.current) return
    called.current = true

    async function handle() {
      // Exchange the one-time browser code; native has already exchanged it.
      try {
        await handleOAuthCallback()
      } catch {
        setError('The sign-in link expired or could not be used. Please try again.')
        return
      }

      // Check if we have a valid session
      const token = getAccessToken()
      if (!token) {
        setError('Sign-in did not complete. Please try again.')
        return
      }

      try {
        // Check if user already exists in our DB (returning user vs brand new)
        const { data: meData } = await apolloClient.query({
          query: GET_ME,
          fetchPolicy: 'network-only',
        })
        if (meData?.me?.onboardingComplete) {
          navigate(takeAuthDestination('/feed'), { replace: true })
        } else {
          navigate('/onboarding', { replace: true })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your profile. Please retry.')
      }
    }

    handle()
  }, [navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <img src="/icon-192.png" alt="CRITERIA" className="mb-3 h-12 w-12 rounded-2xl object-cover" />
        {error ? <>
          <p role="alert" className="text-lg font-semibold text-white">Sign-in needs another try</p>
          <p className="text-sm text-primary-200">{error}</p>
          <Link to="/sign-in" className="mt-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary">Back to sign-in</Link>
        </> : <>
          <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden="true" />
          <p className="text-sm text-primary-200">Signing you in…</p>
        </>}
      </div>
    </div>
  )
}
