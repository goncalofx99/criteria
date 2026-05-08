import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { apolloClient } from '@/lib/apollo'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GET_ME, UPSERT_USER } from '@/lib/gql'

export default function AuthCallback() {
  const navigate = useNavigate()
  const called = useRef(false)
  const [upsertUser] = useMutation(UPSERT_USER)

  useEffect(() => {
    if (called.current) return
    called.current = true

    async function handle() {
      // Wait for the session to be fully available. On native OAuth flows,
      // onAuthStateChange may not have fired yet by the time we reach this page,
      // so we poll briefly to ensure the token is cached for the Apollo auth link.
      let session = (await supabase.auth.getSession()).data.session

      if (!session) {
        // Give onAuthStateChange a moment to fire (native OAuth race condition)
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 3000)
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (s) {
              session = s
              clearTimeout(timeout)
              subscription.unsubscribe()
              resolve()
            }
          })
          // If session appeared while we were setting up the listener
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              session = s
              clearTimeout(timeout)
              subscription.unsubscribe()
              resolve()
            }
          })
        })
      }

      if (!session) {
        navigate('/', { replace: true })
        return
      }

      const { user } = session

      try {
        // Check if user already exists in our DB (returning user vs brand new)
        const { data: meData } = await apolloClient.query({
          query: GET_ME,
          fetchPolicy: 'network-only',
        })
        const isReturningUser = !!meData?.me

        const { data } = await upsertUser({
          variables: {
            input: {
              email: user.email!,
              fullName: user.user_metadata?.full_name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            },
          },
          update: (cache, { data }) => {
            if (data?.upsertUser) {
              cache.writeQuery({ query: GET_ME, data: { me: data.upsertUser } })
            }
          },
        })

        // Returning users go straight to feed; new users go through onboarding
        if (isReturningUser && data?.upsertUser?.role) {
          navigate('/feed', { replace: true })
        } else {
          navigate('/onboarding', { replace: true })
        }
      } catch (err) {
        console.error('upsertUser error:', err)
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
