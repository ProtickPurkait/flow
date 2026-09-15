import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Rocket, Store, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
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
    <div className="flex min-h-screen flex-col bg-background px-6 pt-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground">
          Bring Flow to your business
        </h1>
        <p className="mb-8 text-base text-muted-foreground">Set up your loyalty card in a couple of minutes.</p>

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Store className="h-4 w-4" />
              Customer
            </Link>
            <span className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
              <Building2 className="h-4 w-4" />
              Business
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField label="Business name" htmlFor="businessName">
            <Input
              id="businessName"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
              className="h-14 text-lg"
            />
          </FormField>

          <FormField label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-14 text-lg">
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
          </FormField>

          <FormField label="Phone" htmlFor="phone">
            <div className="flex h-14 items-center rounded-xl border border-border bg-input transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <span className="pl-4 pr-2 text-lg font-medium text-muted-foreground">+91</span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-full flex-1 rounded-r-xl bg-transparent pr-4 text-lg tracking-wider text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </FormField>

          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="h-14 text-lg"
            />
          </FormField>

          <FormField label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-14 text-lg tracking-wider"
            />
          </FormField>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={submitting} className="mt-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Create my loyalty program
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary underline underline-offset-2">
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
