import * as React from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ArrowRight, ChevronLeft, Gift, Store, Building2, ScanLine, Stamp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { FlowLogo } from '@/components/brand/FlowLogo'
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
  { icon: ScanLine, label: 'Scan the QR at the counter', gold: false },
  { icon: Stamp, label: 'Collect a stamp every visit', gold: false },
  { icon: Gift, label: 'Unlock your reward', gold: true },
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
      <div className="flex min-h-screen flex-col bg-background px-6 pt-16">
        <div className="mx-auto w-full max-w-sm">
          {businessPreview ? (
            <div className="mb-5 flex items-center gap-3">
              {businessPreview.logoUrl ? (
                <img
                  src={businessPreview.logoUrl}
                  alt={businessPreview.name}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 font-semibold text-secondary-foreground">
                  {businessPreview.name.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                Join <span className="font-semibold text-foreground">{businessPreview.name}</span>'s rewards
              </p>
            </div>
          ) : (
            <Gift className="mb-3 h-8 w-8 text-primary" />
          )}

          <h1 className="mb-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground">
            {businessPreview ? (
              'Collect stamps. Unlock rewards.'
            ) : (
              <>
                Start collecting <span className="text-primary">rewards!</span>
              </>
            )}
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
            {HOW_IT_WORKS.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
                <div
                  className={
                    item.gold
                      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary'
                      : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground'
                  }
                >
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <Button size="lg" onClick={() => setStep('form')} className="mb-6">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              <span className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
                <Store className="h-4 w-4" />
                Customer
              </span>
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
    <div className="flex min-h-screen flex-col bg-background px-6 pt-16">
      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={() => setStep('intro')}
          className="mb-4 flex cursor-pointer items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="mb-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground">
          {businessPreview ? `Join ${businessPreview.name}` : title}
        </h1>
        <p className="mb-8 text-base text-muted-foreground">{description}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField label="Mobile Number" htmlFor="phone">
            <div className="flex h-14 items-center rounded-xl border border-border bg-input transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <span className="pl-4 pr-2 text-lg font-medium text-muted-foreground">+91</span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-full flex-1 rounded-r-xl bg-transparent pr-4 text-lg tracking-wider text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </FormField>

          <FormField label="Name" htmlFor="name">
            <Input
              id="name"
              autoComplete="name"
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 text-lg"
            />
          </FormField>

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
