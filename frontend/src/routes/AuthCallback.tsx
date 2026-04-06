import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GET_ME, UPSERT_USER } from '@/lib/gql'
import { apolloClient } from '@/lib/apollo'

export default function AuthCallback() {
  const navigate = useNavigate()
  const called = useRef(false)
  const [upsertUser] = useMutation(UPSERT_USER)

  useEffect(() => {
    if (called.current) return
    called.current = true

    async function handle() {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/', { replace: true })
        return
      }

      const { user } = session

      // Upsert basic info from Google — role not set yet
      try {
        await upsertUser({
          variables: {
            input: {
              email: user.email!,
              fullName: user.user_metadata?.full_name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            },
          },
        })
      } catch (err) {
        console.error('upsertUser error:', err)
      }

      // Check if user already has a role via DB
      try {
        const { data } = await apolloClient.query({ query: GET_ME, fetchPolicy: 'network-only' })
        if (data?.me?.role) {
          navigate('/feed', { replace: true })
        } else {
          navigate('/onboarding', { replace: true })
        }
      } catch {
        navigate('/onboarding', { replace: true })
      }
    }

    handle()
  }, [navigate, upsertUser])

  return (
    <div className="flex h-dvh items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-sm text-primary-400">Signing you in…</p>
      </div>
    </div>
  )
}
