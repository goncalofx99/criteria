import { useEffect, useState } from 'react'
import { getAccessToken, onAuthChange, signOut, refreshAccessToken } from '@/lib/auth'

interface AuthState {
  isAuthenticated: boolean
  loading: boolean
}

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: !!getAccessToken(),
    loading: true,
  })

  useEffect(() => {
    let active = true
    // Expired access tokens must not leave protected screens appearing signed in.
    async function check() {
      const token = getAccessToken()
      if (token) {
        if (active) setState({ isAuthenticated: true, loading: false })
      } else {
        const refreshed = await refreshAccessToken()
        if (active) setState({ isAuthenticated: !!refreshed, loading: false })
      }
    }
    void check()

    const interval = window.setInterval(() => { void check() }, 60_000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Listen for auth state changes (login, logout, refresh)
    const unsub = onAuthChange((token) => {
      setState((prev) => ({ ...prev, isAuthenticated: !!token }))
    })

    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      unsub()
    }
  }, [])

  return {
    ...state,
    signOut,
  }
}
