import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { AppLayout }  from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { registerDeepLinkHandler } from '@/lib/native-auth'

// ─── Lazy-loaded routes ──────────────────────────────────────────────────────
const LandingPage        = lazy(() => import('@/routes/LandingPage'))
const SignInPage          = lazy(() => import('@/routes/SignInPage'))
const SignUpPage          = lazy(() => import('@/routes/SignUpPage'))
const AuthCallback        = lazy(() => import('@/routes/AuthCallback'))
const CheckEmail          = lazy(() => import('@/routes/CheckEmail'))
const Onboarding          = lazy(() => import('@/routes/Onboarding'))
const FeedPage            = lazy(() => import('@/routes/FeedPage'))
const CreatePostPage      = lazy(() => import('@/routes/CreatePostPage'))
const ProfilePage         = lazy(() => import('@/routes/ProfilePage'))
const PropertyDetailPage  = lazy(() => import('@/routes/PropertyDetailPage'))
const PropertyEditPage    = lazy(() => import('@/routes/PropertyEditPage'))
const CriteriaDetailPage  = lazy(() => import('@/routes/CriteriaDetailPage'))
const CriteriaEditPage    = lazy(() => import('@/routes/CriteriaEditPage'))

function RouteSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-3 text-lg font-medium text-foreground">Page not found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white"
      >
        Go home
      </Link>
    </div>
  )
}

function NativeAuthBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    return registerDeepLinkHandler(
      (tokens) => {
        // Store tokens from native OAuth deep link
        localStorage.setItem('criteria_access_token', tokens.accessToken)
        localStorage.setItem('criteria_refresh_token', tokens.refreshToken)
        navigate('/auth/callback', { replace: true })
      },
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
    <ErrorBoundary>
      <BrowserRouter>
        <NativeAuthBridge />
        <Suspense fallback={<RouteSpinner />}>
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

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
