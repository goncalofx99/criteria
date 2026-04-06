import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage   from '@/routes/LandingPage'
import SignInPage    from '@/routes/SignInPage'
import SignUpPage    from '@/routes/SignUpPage'
import AuthCallback  from '@/routes/AuthCallback'
import Onboarding    from '@/routes/Onboarding'
import CheckEmail    from '@/routes/CheckEmail'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

// Placeholder — will be replaced in Phase 2
function Feed() {
  return (
    <div className="app-shell flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Feed coming in Phase 2 🌿</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
