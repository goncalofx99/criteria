import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LandingPage    from '@/routes/LandingPage'
import SignInPage     from '@/routes/SignInPage'
import SignUpPage     from '@/routes/SignUpPage'
import AuthCallback   from '@/routes/AuthCallback'
import Onboarding     from '@/routes/Onboarding'
import CheckEmail     from '@/routes/CheckEmail'
import FeedPage       from '@/routes/FeedPage'
import CreatePostPage from '@/routes/CreatePostPage'
import ProfilePage    from '@/routes/ProfilePage'
import PropertyDetailPage from '@/routes/PropertyDetailPage'
import PropertyEditPage   from '@/routes/PropertyEditPage'
import CriteriaDetailPage from '@/routes/CriteriaDetailPage'
import CriteriaEditPage   from '@/routes/CriteriaEditPage'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { AppLayout }  from '@/components/layout/AppLayout'
import { registerDeepLinkHandler } from '@/lib/native-auth'

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
          <Route element={<AppLayout />}>
            <Route path="/feed"               element={<FeedPage />} />
            <Route path="/create"             element={<CreatePostPage />} />
            <Route path="/profile"            element={<ProfilePage />} />
            <Route path="/listing/:id"        element={<PropertyDetailPage />} />
            <Route path="/listing/:id/edit"   element={<PropertyEditPage />} />
            <Route path="/criteria/:id"       element={<CriteriaDetailPage />} />
            <Route path="/criteria/:id/edit"  element={<CriteriaEditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
