import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { AppLayout }  from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { registerDeepLinkHandler } from '@/lib/native-auth'
import { clearLocalSession, completeGoogleOAuthCode } from '@/lib/auth'
import { GET_ME } from '@/lib/gql'
import { RouteMetadata } from '@/components/RouteMetadata'
import { SiteFooter } from '@/components/SiteFooter'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Lazy-loaded routes ──────────────────────────────────────────────────────
const LandingPage        = lazy(() => import('@/routes/LandingPage'))
const SignInPage          = lazy(() => import('@/routes/SignInPage'))
const SignUpPage          = lazy(() => import('@/routes/SignUpPage'))
const ForgotPasswordPage  = lazy(() => import('@/routes/ForgotPasswordPage'))
const ResetPasswordPage   = lazy(() => import('@/routes/ResetPasswordPage'))
const AuthCallback        = lazy(() => import('@/routes/AuthCallback'))
const Onboarding          = lazy(() => import('@/routes/Onboarding'))
const FeedPage            = lazy(() => import('@/routes/FeedPage'))
const CreatePostPage      = lazy(() => import('@/routes/CreatePostPage'))
const ProfilePage         = lazy(() => import('@/routes/ProfilePage'))
const SettingsPage        = lazy(() => import('@/routes/SettingsPage'))
const VerifyEmailPage     = lazy(() => import('@/routes/VerifyEmailPage'))
const ConfirmDeletePage   = lazy(() => import('@/routes/ConfirmDeletePage'))
const PrivacyPage         = lazy(() => import('@/routes/PrivacyPage'))
const TermsPage           = lazy(() => import('@/routes/TermsPage'))
const InboxPage           = lazy(() => import('@/routes/InboxPage'))
const PropertyDetailPage  = lazy(() => import('@/routes/PropertyDetailPage'))
const PropertyEditPage    = lazy(() => import('@/routes/PropertyEditPage'))
const CriteriaDetailPage  = lazy(() => import('@/routes/CriteriaDetailPage'))
const CriteriaEditPage    = lazy(() => import('@/routes/CriteriaEditPage'))

function RouteSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="min-h-dvh bg-background">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="border-b border-white/10 bg-primary-900 px-4 py-4 md:px-8">
        <div className="workspace-content flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 bg-white/20" />
          <Skeleton className="h-4 w-28 bg-white/20" />
          <div className="ml-auto hidden gap-3 md:flex"><Skeleton className="h-9 w-20 rounded-full bg-white/20" /><Skeleton className="h-9 w-20 rounded-full bg-white/20" /></div>
        </div>
      </div>
      <div aria-hidden="true" className="workspace-content space-y-6 px-5 py-8 md:px-8 md:py-12">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-5 pt-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="hidden h-64 w-full rounded-2xl md:block" />
          <Skeleton className="hidden h-64 w-full rounded-2xl lg:block" />
        </div>
      </div>
    </div>
  )
}

function OnboardingGate() {
  const location = useLocation()
  const { data, loading, error, refetch } = useQuery<{ me: { onboardingComplete: boolean } | null }>(GET_ME, { fetchPolicy: 'cache-and-network' })
  useEffect(() => {
    // A locally unexpired JWT can already be revoked on the server. The `me`
    // query is public and returns null for that case, so clear the local token
    // before deciding whether this is an incomplete onboarding account.
    if (!loading && !error && data?.me === null) clearLocalSession()
  }, [data?.me, error, loading])
  if (loading && !data) return <RouteSkeleton />
  if (error && !data?.me) return <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center gap-4 px-6 text-center"><p role="alert" className="text-sm text-destructive">Could not load your account.</p><button type="button" onClick={() => void refetch()} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white">Try again</button></div>
  if (data?.me === null) return <RouteSkeleton />
  if (!data?.me?.onboardingComplete) {
    const next = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/onboarding?next=${encodeURIComponent(next)}`} replace />
  }
  return <AppLayout />
}

function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col justify-center px-6 py-16 md:px-10">
        <nav aria-label="Breadcrumb" className="mb-12 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link to="/" className="underline underline-offset-4 hover:text-primary">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Page not found</span>
        </nav>
        <p className="editorial-kicker">404 · Wrong turn</p>
        <h1 className="mt-4 max-w-[750px] text-[clamp(3.5rem,12vw,8rem)] font-semibold leading-[.9] tracking-[-.05em] text-foreground">No match for this address.</h1>
        <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground">This page may have moved, or the link may be incomplete. Return to CRITERIA to continue.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-700">Go to CRITERIA home</Link>
          <Link to="/sign-in" className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground hover:bg-overlay">Sign in</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function NativeAuthBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    return registerDeepLinkHandler(
      async (code) => {
        await completeGoogleOAuthCode(code)
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
        <RouteMetadata />
        <Suspense fallback={<RouteSkeleton />}>
          <Routes>
            {/* Public */}
            <Route path="/"              element={<LandingPage />} />
            <Route path="/sign-in"       element={<SignInPage />} />
            <Route path="/sign-up"       element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/settings/verify-email" element={<VerifyEmailPage />} />
            <Route path="/settings/confirm-delete" element={<ConfirmDeletePage />} />
            <Route path="/privacy"       element={<PrivacyPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/check-email"   element={<Navigate to="/sign-in" replace />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding"  element={<Onboarding />} />
              <Route element={<OnboardingGate />}>
                <Route path="/feed"               element={<FeedPage />} />
                <Route path="/create"             element={<CreatePostPage />} />
                <Route path="/profile"            element={<ProfilePage />} />
                <Route path="/settings"           element={<SettingsPage />} />
                <Route path="/inbox"              element={<InboxPage />} />
                <Route path="/inbox/:id"          element={<InboxPage />} />
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
