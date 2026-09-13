import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { FlowLogo } from '@/components/brand/FlowLogo'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-flow-aurora px-6 pb-16 pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <Link to="/" className="mb-8 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated September 2026</p>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. What we collect</h2>
            <p>
              When you register with Flow, we collect your mobile number and name. We do not require a password or
              an OTP verification code — your device is used to keep you signed in.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. How we use it</h2>
            <p>
              Your mobile number is the single identifier we use to find and update your loyalty account across
              participating businesses. Your name is shown to business staff so they can recognize you in person.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Sharing</h2>
            <p>
              Your details are visible only to the businesses whose loyalty programs you join. We do not sell your
              information to third parties.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Your choices</h2>
            <p>
              You can update your name at any time from your profile. To remove your data, contact the business
              directly or reach out to Fenlark Technologies.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Contact</h2>
            <p>Questions about this policy can be sent to Fenlark Technologies.</p>
          </section>
        </div>

        <div className="mt-12 flex justify-center">
          <FlowLogo className="h-6 w-6 opacity-70" />
        </div>
      </div>
    </div>
  )
}
