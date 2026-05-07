import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LandingPage   from '@/routes/LandingPage'
import SignInPage    from '@/routes/SignInPage'
import SignUpPage    from '@/routes/SignUpPage'
import AuthCallback  from '@/routes/AuthCallback'
import Onboarding    from '@/routes/Onboarding'
import CheckEmail    from '@/routes/CheckEmail'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { registerDeepLinkHandler } from '@/lib/native-auth'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Placeholder — will be replaced in Phase 2
function Feed() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell flex flex-col items-center justify-center gap-6 bg-background px-6">
      <p className="text-muted-foreground text-sm">Feed coming in Phase 2 🌿</p>
      <Button
        variant="outline"
        size="lg"
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-xl"
      >
        {signingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign out'}
      </Button>
    </div>
  )
}

function NativeAuthBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    return registerDeepLinkHandler(
      () => navigate('/auth/callback', { replace: true }),
      (msg) => {
        console.error('OAuth deep link error:', msg)
        navigate('/sign-in', { replace: true })
      },
    )
  }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <NativeAuthBridge />
      <Routes>
        {/* Public */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/sign-in"       element={<SignInPage />} />
        <Route path="/sign-up"       element={<SignUpPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/check-email"   element={<CheckEmail />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding"  element={<Onboarding />} />
          <Route path="/feed"        element={<Feed />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
