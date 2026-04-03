import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckEmail() {
  return (
    <div className="app-shell flex flex-col items-center justify-center bg-background px-6 text-center">
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
