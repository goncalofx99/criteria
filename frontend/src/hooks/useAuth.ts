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
    // Check if we have a valid session on mount
    async function check() {
      const token = getAccessToken()
      if (token) {
        setState({ isAuthenticated: true, loading: false })
      } else {
        // Try refreshing
        const refreshed = await refreshAccessToken()
        setState({ isAuthenticated: !!refreshed, loading: false })
      }
    }
    check()

    // Listen for auth state changes (login, logout, refresh)
    const unsub = onAuthChange((token) => {
      setState((prev) => ({ ...prev, isAuthenticated: !!token }))
    })

    return unsub
  }, [])

  return {
    ...state,
    signOut,
  }
}
