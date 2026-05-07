import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
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
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/', { replace: true })
        return
      }

      const { user } = session

      try {
        // upsertUser returns the full user (including role) — no need to fetch
        // it back with a separate GET_ME round-trip.
        const { data } = await upsertUser({
          variables: {
            input: {
              email: user.email!,
              fullName: user.user_metadata?.full_name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            },
          },
          // Seed the GET_ME cache so the destination page renders instantly
          // without firing another network request.
          update: (cache, { data }) => {
            if (data?.upsertUser) {
              cache.writeQuery({ query: GET_ME, data: { me: data.upsertUser } })
            }
          },
        })

        const role = data?.upsertUser?.role
        navigate(role ? '/feed' : '/onboarding', { replace: true })
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
