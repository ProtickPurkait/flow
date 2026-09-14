import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Rocket, Store, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { FlowLogo } from '@/components/brand/FlowLogo'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { BUSINESS_CATEGORIES } from '@/lib/categories'

export default function SignupPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [businessName, setBusinessName] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('business-signup', {
        body: { businessName, category: category || null, phone: phone || null, email, password },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      await signIn(email, password)
      toast({ title: 'Welcome to Flow!', description: 'Set up your loyalty card to get started.', variant: 'success' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-flow-aurora px-6 pt-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-foreground">Bring Flow to your business</h1>
        <p className="mb-8 text-base text-muted-foreground">Set up your loyalty card in a couple of minutes.</p>

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
            <Label htmlFor="businessName" className="text-sm font-medium text-foreground">
              Business name
            </Label>
            <input
              id="businessName"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
              className="h-14 w-full rounded-2xl border border-transparent bg-muted/60 px-4 text-lg text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-14 rounded-2xl border-transparent bg-muted/60 text-lg">
                <SelectValue placeholder="What kind of business?" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone
            </Label>
            <div className="flex h-14 items-center rounded-2xl border border-transparent bg-muted/60 transition-colors focus-within:border-primary focus-within:bg-card">
              <span className="pl-4 pr-2 text-lg font-medium text-foreground/70">+91</span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-full flex-1 rounded-r-2xl bg-transparent pr-4 text-lg tracking-wider text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-14 w-full rounded-2xl border border-transparent bg-muted/60 px-4 text-lg tracking-wider text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={submitting} className="mt-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Create my loyalty program
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-foreground underline underline-offset-2">
              Sign in
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
