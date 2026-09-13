import { Link } from 'react-router-dom'
import { ChevronLeft, MessageCircle, HelpCircle, Gift } from 'lucide-react'
import { FlowLogo } from '@/components/brand/FlowLogo'

const FAQS = [
  {
    q: 'How do I collect a stamp?',
    a: 'Ask staff to scan your QR code at checkout, or scan their code from the Explore tab. Each approved visit adds a stamp to that business’s card.',
  },
  {
    q: 'Why hasn’t my stamp shown up yet?',
    a: 'Stamps need to be approved by the business before they appear. This usually happens within a few minutes of your visit.',
  },
  {
    q: 'Can I use Flow at more than one business?',
    a: 'Yes. Every business you visit and join through Flow gets its own card and reward progress, all in one app.',
  },
  {
    q: 'I changed my phone. What happens to my rewards?',
    a: 'Your account is tied to your mobile number, not your device. Register with the same number on your new phone and your cards will be there.',
  },
]

export default function HelpSupportPage() {
  return (
    <div className="min-h-screen bg-flow-aurora px-6 pb-16 pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col">
        <Link to="/profile" className="mb-8 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Help &amp; Support</h1>
        <p className="mb-8 text-sm text-muted-foreground">Answers to common questions, and how to reach us.</p>

        <div className="flex flex-col gap-3">
          {FAQS.map((item) => (
            <div key={item.q} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{item.q}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.a}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Trouble with a specific business?</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              For missing stamps or reward issues, the staff at that business can look up and fix your account
              directly — they have access to your card from their dashboard.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Still need help?</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Reach out to Fenlark Technologies and we'll sort it out.</p>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <FlowLogo className="h-6 w-6 opacity-70" />
        </div>
      </div>
    </div>
  )
}
