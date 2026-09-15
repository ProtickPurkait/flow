import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ScanLine, Gift, ChevronRight } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { listMyCards, getMyProfile } from '@/lib/customer'
import { PhoneCapturePrompt } from '@/components/customer/PhoneCapturePrompt'
import { QrScanner } from '@/components/customer/QrScanner'
import { BusinessCard } from '@/components/customer/BusinessCard'
import { BottomNav } from '@/components/layout/BottomNav'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { FlowLogo } from '@/components/brand/FlowLogo'
import type { MyCardRow } from '@/types/database'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

export default function HomePage() {
  const { loading, registered, refresh } = useCustomerAccount()
  const [cards, setCards] = React.useState<MyCardRow[] | null>(null)
  const [name, setName] = React.useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!registered) return
    listMyCards().then(setCards)
    getMyProfile().then((p) => setName(p?.name ?? null))
  }, [registered])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!registered) {
    return <PhoneCapturePrompt onRegistered={refresh} />
  }

  const closestToReward = cards
    ?.filter((c) => c.stamps_required)
    .sort((a, b) => (b.current_stamps - (b.stamps_required ?? 0)) - (a.current_stamps - (a.stamps_required ?? 0)))[0]

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        variant="hero"
        title={
          <div className="flex items-center gap-3">
            <FlowLogo className="h-9 w-9 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{greeting()}</p>
              <p className="font-display text-lg font-semibold text-foreground">{name ?? 'there'}</p>
            </div>
          </div>
        }
      >
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Collect &bull; Explore &bull; Enjoy &bull; Repeat
        </p>
        {closestToReward && closestToReward.stamps_required && (
          <p className="mt-3 max-w-md font-display text-xl font-semibold leading-snug text-foreground">
            <span className="text-primary">
              {Math.max(0, closestToReward.stamps_required - closestToReward.current_stamps)} visit
              {closestToReward.stamps_required - closestToReward.current_stamps === 1 ? '' : 's'}
            </span>{' '}
            to your next reward.
          </p>
        )}
      </PageHeader>

      <div className="mx-auto -mt-3 max-w-md px-4">
        <button
          onClick={() => setScannerOpen(true)}
          className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ScanLine className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">At a shop right now?</p>
            <p className="text-sm text-muted-foreground">Scan the QR at the counter to collect a stamp.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>

        <div className="mt-7">
          <SectionHeader
            title="My cards"
            action={
              <a href="/explore" className="text-sm font-semibold text-primary">
                Find more &rarr;
              </a>
            }
          />
        </div>

        {cards === null ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No cards yet"
            description="Scan a QR code at a shop, or explore businesses near you to start your first card."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((c) => (
              <BusinessCard
                key={c.membership_id}
                name={c.business_name}
                logoUrl={c.logo_url}
                subtitle={`${c.current_stamps}${c.stamps_required ? ` / ${c.stamps_required}` : ''} stamps${c.category ? ` · ${c.category}` : ''}`}
                onClick={() => navigate(`/business/${c.business_slug}`)}
                trailing={<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
      {scannerOpen && (
        <QrScanner onDetect={(slug) => navigate(`/b/${slug}`)} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  )
}
