import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckEmail() {
  return (
    <div className="app-shell auth-page flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[.16em] text-foreground"><span className="flex h-9 w-9 overflow-hidden rounded-xl bg-accent"><img src="/icon-192.png" alt="" className="h-full w-full scale-[1.8] object-cover" /></span>CRITERIA</div>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 mb-6">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
        We sent a confirmation link to your email address. Click it to activate your account.
      </p>
      <Button asChild variant="outline" className="mt-8 rounded-xl w-full max-w-xs">
        <Link to="/sign-in">Back to login</Link>
      </Button>
    </div>
  )
}
