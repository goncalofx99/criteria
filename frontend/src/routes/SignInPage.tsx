import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '@/lib/auth'
import { warmUpBackend } from '@/lib/warmup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'

export default function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { warmUpBackend() }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/auth/callback', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      setLoading(false)
    }
  }

  return (
    <div className="app-shell auth-page flex flex-col">
      {/* Header */}
      <div className="web-content flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="rounded-full text-muted-foreground"
        >
          <Link to="/"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <span className="text-xs font-semibold tracking-[.16em] text-primary">CRITERIA</span>
      </div>

      <div className="web-content auth-panel my-auto flex flex-none flex-col px-6 py-8 md:px-9 md:py-9">
        {/* Title */}
        <div className="mb-8">
          <p className="editorial-kicker">Continue your search</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-primary-900">Welcome back.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to pick up where you left off.</p>
        </div>

        {/* Social auth */}
        <div className="mb-6">
          <SocialAuthButtons
            variant="compact"
            onError={setError}
          />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">or sign in with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => {
                  alert('Please use Google sign-in or contact support to reset your password.')
                }}
                className="text-xs text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tap-target"
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading || !email || !password}
            className="w-full rounded-xl mt-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log in'}
          </Button>
        </form>
      </div>

      {/* Sign up link */}
      <p className="web-content px-6 pb-10 pb-safe text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/sign-up" className="font-medium text-primary hover:underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  )
}
