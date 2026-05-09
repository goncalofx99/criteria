import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { apolloClient } from '@/lib/apollo'
import { Loader2 } from 'lucide-react'
import { handleOAuthCallback, getAccessToken } from '@/lib/auth'
import { GET_ME, UPSERT_USER } from '@/lib/gql'

export default function AuthCallback() {
  const navigate = useNavigate()
  const called = useRef(false)
  const [upsertUser] = useMutation(UPSERT_USER)

  useEffect(() => {
    if (called.current) return
    called.current = true

    async function handle() {
      // Try to extract tokens from URL (Google OAuth redirect)
      handleOAuthCallback()

      // Check if we have a valid session
      const token = getAccessToken()
      if (!token) {
        navigate('/', { replace: true })
        return
      }

      try {
        // Check if user already exists in our DB (returning user vs brand new)
        const { data: meData } = await apolloClient.query({
          query: GET_ME,
          fetchPolicy: 'network-only',
        })
        const isReturningUser = !!meData?.me

        if (isReturningUser && meData.me.role) {
          navigate('/feed', { replace: true })
        } else {
          // New Google OAuth user — needs onboarding
          navigate('/onboarding', { replace: true })
        }
      } catch (err) {
        console.error('AuthCallback error:', err)
        navigate('/onboarding', { replace: true })
      }
    }

    handle()
  }, [navigate, upsertUser])

  return (
    <div className="flex h-dvh items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-sm text-primary-400">Signing you in...</p>
      </div>
    </div>
  )
}
