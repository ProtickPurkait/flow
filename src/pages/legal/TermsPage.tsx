import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { FlowLogo } from '@/components/brand/FlowLogo'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-flow-aurora px-6 pb-16 pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <Link to="/" className="mb-8 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Terms &amp; Conditions</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated September 2026</p>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. Using Flow</h2>
            <p>
              Flow is a digital loyalty platform operated by Fenlark Technologies on behalf of participating
              businesses. By registering with your mobile number, you agree to these terms for every business you
              join through the app.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. Your account</h2>
            <p>
              Your account is identified by your mobile number. Stamps, rewards, and membership history are tied to
              that number, so keep it up to date with the businesses you visit.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. Stamps &amp; rewards</h2>
            <p>
              Stamps are issued at the discretion of each participating business and may be adjusted to correct
              errors or prevent misuse. Rewards have no cash value and cannot be transferred between accounts.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of Flow after a change means you accept the
              updated terms.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Contact</h2>
            <p>Questions about these terms can be sent to Fenlark Technologies.</p>
          </section>
        </div>

        <div className="mt-12 flex justify-center">
          <FlowLogo className="h-6 w-6 opacity-70" />
        </div>
      </div>
    </div>
  )
}
