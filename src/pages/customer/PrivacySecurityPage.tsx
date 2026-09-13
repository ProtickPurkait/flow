import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShieldCheck, Smartphone, Eye } from 'lucide-react'
import { FlowLogo } from '@/components/brand/FlowLogo'

export default function PrivacySecurityPage() {
  return (
    <div className="min-h-screen bg-flow-aurora px-6 pb-16 pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <Link to="/profile" className="mb-8 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Privacy &amp; Security</h1>
        <p className="mb-8 text-sm text-muted-foreground">How your account and data are kept safe.</p>

        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No passwords, no OTPs</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your account is tied to this device. There's no password to leak or OTP to intercept.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Who can see your details</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Only the businesses whose loyalty programs you join can see your name, phone number, and visit
                history with them.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Your data</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Read the full <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2">Privacy Policy</Link> for
                details on what we collect and how to request its removal.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/privacy"
          className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4 font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Read the full Privacy Policy
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <div className="mt-12 flex justify-center">
          <FlowLogo className="h-6 w-6 opacity-70" />
        </div>
      </div>
    </div>
  )
}
