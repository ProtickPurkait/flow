import { Gift } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RewardCardProps {
  businessName: string
  logoUrl: string | null
  description: string
  redeemed: boolean
  redemptionCode: string | null
  onClick: () => void
  className?: string
}

export function RewardCard({ businessName, logoUrl, description, redeemed, redemptionCode, onClick, className }: RewardCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3.5 text-left',
        'transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
        !redeemed && 'border-primary/25',
        className
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary">
        {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Gift className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{businessName}</p>
        <p className="truncate text-sm text-muted-foreground">{description}</p>
      </div>
      {redeemed ? (
        <Badge variant="outline">Redeemed</Badge>
      ) : (
        <Badge className="font-mono">{redemptionCode}</Badge>
      )}
    </button>
  )
}
