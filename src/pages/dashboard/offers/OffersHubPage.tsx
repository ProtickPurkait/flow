import { Link } from 'react-router-dom'
import { Stamp, Sparkles, UtensilsCrossed, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const TILES = [
  {
    to: '/dashboard/offers/stamp-card',
    icon: Stamp,
    label: 'Stamp Card',
    sub: 'LOYALTY PROGRAM',
    tone: 'bg-primary text-white',
  },
  {
    to: '/dashboard/offers/scratch-cards',
    icon: Sparkles,
    label: 'Scratch Card',
    sub: 'INSTANT GIFTS',
    tone: 'bg-amber-500 text-white',
  },
  {
    to: '/dashboard/offers/digital-menu',
    icon: UtensilsCrossed,
    label: 'Digital Menu',
    sub: 'QR MENU CARD',
    tone: 'bg-success text-white',
  },
]

export default function OffersHubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold">Create Offers</h1>
        <p className="text-sm text-muted-foreground">Choose an app to create rewards for your customers</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="flex flex-col items-center gap-2 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full shadow-md ${t.tone}`}>
              <t.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{t.label}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Pro Tip</p>
            <p className="text-sm text-muted-foreground">
              You can have Stamp Cards and Scratch Cards active at the same time to maximize customer engagement and
              retention.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
