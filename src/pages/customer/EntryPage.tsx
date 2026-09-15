import * as React from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import gsap from 'gsap'
import { Loader2, ArrowRight, Compass, ScanLine, Stamp, Gift } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ensureCustomerSession, isRegistered, registerCustomer, joinBusiness } from '@/lib/customer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { FlowLogo } from '@/components/brand/FlowLogo'
import type { Business } from '@/types/database'

type Phase = 'loading' | 'form' | 'joining' | 'not-found'

export default function EntryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref')
  const navigate = useNavigate()
  const heroRef = React.useRef<HTMLDivElement>(null)

  const [phase, setPhase] = React.useState<Phase>('loading')
  const [business, setBusiness] = React.useState<Business | null>(null)
  const [program, setProgram] = React.useState<{ stamps_required: number; reward_description: string } | null>(null)
  const [phone, setPhone] = React.useState('')
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!slug) return
    const businessSlug = slug

    let cancelled = false

    async function bootstrap() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', businessSlug)
        .eq('status', 'active')
        .maybeSingle()

      if (cancelled) return
      if (!biz) {
        setPhase('not-found')
        return
      }
      setBusiness(biz)

      supabase
        .from('stamp_programs')
        .select('stamps_required, reward_description')
        .eq('business_id', biz.id)
        .eq('is_active', true)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setProgram(data)
        })

      await ensureCustomerSession()
      const registered = await isRegistered()

      if (cancelled) return

      if (registered) {
        setPhase('joining')
        try {
          await joinBusiness(businessSlug, referralCode)
          navigate(`/business/${businessSlug}`, { replace: true })
        } catch {
          setPhase('form')
        }
      } else {
        setPhase('form')
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [slug, navigate, referralCode])

  React.useEffect(() => {
    if (phase === 'form' && heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08 }
      )
    }
  }, [phase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) return
    setError(null)
    setSubmitting(true)
    try {
      await registerCustomer(phone, name)
      await joinBusiness(slug, referralCode)
      navigate(`/business/${slug}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  if (phase === 'loading' || phase === 'joining') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (phase === 'not-found') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">We couldn't find this place</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          This QR code may be inactive. Ask staff for a fresh one.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pt-16">
      <div ref={heroRef} className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          {business?.logo_url && (
            <img src={business.logo_url} alt={business.name} className="h-11 w-11 rounded-xl object-cover" />
          )}
          <p className="text-sm font-medium text-muted-foreground">
            Welcome to <span className="font-semibold text-foreground">{business?.name}</span>
          </p>
        </div>

        <h1 className="mb-3 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground">
          Start collecting <span className="text-primary">stamps!</span>
        </h1>
        {program ? (
          <p className="mb-6 text-base text-muted-foreground">
            Collect <span className="font-semibold text-foreground">{program.stamps_required} stamps</span> to
            unlock: {program.reward_description}
          </p>
        ) : (
          <p className="mb-6 text-base text-muted-foreground">
            Enter your number and unlock rewards at {business?.name}.
          </p>
        )}

        <div className="mb-8 flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3.5">
          {[
            { icon: ScanLine, label: 'Scan', gold: false },
            { icon: Stamp, label: 'Collect', gold: false },
            { icon: Gift, label: 'Unlock', gold: true },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <div
                  className={
                    step.gold
                      ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary'
                      : 'flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground'
                  }
                >
                  <step.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-medium text-foreground">{step.label}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

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
            Start collecting stamps
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
