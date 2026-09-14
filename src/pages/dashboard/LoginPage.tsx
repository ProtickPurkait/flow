import * as React from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Loader2, LockKeyhole, Store, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FlowLogo } from '@/components/brand/FlowLogo'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, location.state, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      toast({
        title: 'Could not sign in',
        description: err instanceof Error ? err.message : 'Check your email and password.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-flow-aurora px-6 pt-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-foreground">Welcome back</h1>
        <p className="mb-8 text-base text-muted-foreground">Sign in to run your loyalty program.</p>

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full bg-muted p-1 shadow-inner">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground"
            >
              <Store className="h-4 w-4" />
              Customer
            </Link>
            <span className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm">
              <Building2 className="h-4 w-4" />
              Business
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="h-14 w-full rounded-2xl border border-transparent bg-muted/60 px-4 text-lg text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-14 w-full rounded-2xl border border-transparent bg-muted/60 px-4 text-lg tracking-wider text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="mt-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            Sign in
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            New to Flow?{' '}
            <Link to="/signup" className="font-semibold text-foreground underline underline-offset-2">
              Create your business account
            </Link>
          </p>

          <div className="flex flex-col items-center gap-3 pb-4 pt-1">
            <p className="text-center text-xs text-muted-foreground">
              By proceeding, you agree to our{' '}
              <Link to="/terms" className="font-medium text-foreground underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
            <FlowLogo className="h-5 w-5 opacity-70" />
          </div>
        </form>
      </div>
    </div>
  )
}
