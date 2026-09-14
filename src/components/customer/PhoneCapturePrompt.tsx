import * as React from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight, ChevronLeft, Gift, Store, Building2, ScanLine, Stamp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FlowLogo } from '@/components/brand/FlowLogo'
import { cn } from '@/lib/utils'
import { registerCustomer } from '@/lib/customer'

export interface BusinessPreview {
  name: string
  logoUrl: string | null
  stampsRequired: number | null
  rewardDescription: string | null
}

interface PhoneCapturePromptProps {
  title?: string
  description?: string
  onRegistered: () => void
  businessPreview?: BusinessPreview | null
}

const HOW_IT_WORKS = [
  { icon: ScanLine, label: 'Scan the QR at the counter' },
  { icon: Stamp, label: 'Collect a stamp every visit' },
  { icon: Gift, label: 'Unlock your reward' },
]

export function PhoneCapturePrompt({
  title = 'Start collecting rewards!',
  description = 'Enter your number — your rewards are waiting.',
  onRegistered,
  businessPreview,
}: PhoneCapturePromptProps) {
  const [step, setStep] = React.useState<'intro' | 'form'>('intro')
  const [phone, setPhone] = React.useState('')
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await registerCustomer(phone, name)
      onRegistered()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  if (step === 'intro') {
    return (
      <div className="flex min-h-screen flex-col bg-flow-aurora px-6 pt-16">
        <div className="mx-auto w-full max-w-sm">
          {businessPreview ? (
            <div className="mb-5 flex items-center gap-3">
              {businessPreview.logoUrl ? (
                <img
                  src={businessPreview.logoUrl}
                  alt={businessPreview.name}
                  className="h-12 w-12 rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary">
                  {businessPreview.name.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                Join <span className="font-semibold text-foreground">{businessPreview.name}</span>'s rewards
              </p>
            </div>
          ) : (
            <Gift className="mb-3 h-8 w-8 text-secondary" />
          )}

          <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-foreground">
            {businessPreview ? 'Collect stamps. Unlock rewards.' : title}
          </h1>

          {businessPreview?.stampsRequired && businessPreview.rewardDescription ? (
            <p className="mb-6 text-base text-muted-foreground">
              Collect <span className="font-semibold text-foreground">{businessPreview.stampsRequired} stamps</span>{' '}
              to unlock: {businessPreview.rewardDescription}
            </p>
          ) : (
            <p className="mb-6 text-base text-muted-foreground">{description}</p>
          )}

          <div className="mb-8 flex flex-col gap-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <Button size="lg" onClick={() => setStep('form')} className="mb-6">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-muted p-1 shadow-inner">
              <span className="flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm">
                <Store className="h-4 w-4" />
                Customer
              </span>
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                Business
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-flow-aurora px-6 pt-16">
      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={() => setStep('intro')}
          className="mb-4 flex cursor-pointer items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-foreground">
          {businessPreview ? `Join ${businessPreview.name}` : title}
        </h1>
        <p className="mb-8 text-base text-muted-foreground">{description}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Mobile Number
            </Label>
            <div
              className={cn(
                'flex h-14 items-center rounded-2xl border border-transparent bg-muted/60 transition-colors',
                'focus-within:border-primary focus-within:bg-card'
              )}
            >
              <span className="pl-4 pr-2 text-lg font-medium text-foreground/70">+91</span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-full flex-1 rounded-r-2xl bg-transparent pr-4 text-lg tracking-wider text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Name
            </Label>
            <input
              id="name"
              autoComplete="name"
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 w-full rounded-2xl border border-transparent bg-muted/60 px-4 text-lg text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={submitting} className="mt-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            No password, no OTP — just your number, saved on this device.
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
