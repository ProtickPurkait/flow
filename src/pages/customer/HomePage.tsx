import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, ScanLine, Store, ChevronRight } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { listMyCards, getMyProfile } from '@/lib/customer'
import { PhoneCapturePrompt } from '@/components/customer/PhoneCapturePrompt'
import { QrScanner } from '@/components/customer/QrScanner'
import { BottomNav } from '@/components/layout/BottomNav'
import { FlowLogo } from '@/components/brand/FlowLogo'
import type { MyCardRow } from '@/types/database'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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
      <div className="bg-flow-gradient px-6 pb-8 pt-8 text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <FlowLogo className="h-10 w-10 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{greeting()},</p>
            <p className="font-display text-lg font-bold">{name ?? 'there'}</p>
          </div>
        </div>
        {closestToReward && closestToReward.stamps_required && (
          <p className="mx-auto mt-4 max-w-md font-display text-xl font-bold leading-snug">
            {Math.max(0, closestToReward.stamps_required - closestToReward.current_stamps)} visit
            {closestToReward.stamps_required - closestToReward.current_stamps === 1 ? '' : 's'} to your next reward.
          </p>
        )}
      </div>

      <div className="mx-auto -mt-4 max-w-md px-4">
        <button
          onClick={() => setScannerOpen(true)}
          className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-lg transition-transform active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScanLine className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">At a shop right now?</p>
            <p className="text-sm text-muted-foreground">Scan the QR at the counter to collect a stamp.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>

        <div className="mb-3 mt-6 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">My cards</h2>
          <Link to="/explore" className="text-sm font-semibold text-primary">
            Find more
          </Link>
        </div>

        {cards === null ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
            <Store className="h-7 w-7 text-muted-foreground" />
            <p className="font-semibold">No cards yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Scan a QR code at a shop, or explore businesses near you to start your first card.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((c) => (
              <button
                key={c.membership_id}
                onClick={() => navigate(`/business/${c.business_slug}`)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 font-display font-bold text-primary">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    c.business_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.business_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.current_stamps}
                    {c.stamps_required ? ` / ${c.stamps_required}` : ''} stamps
                    {c.category ? ` · ${c.category}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
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
