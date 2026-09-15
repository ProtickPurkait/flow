import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessCardProps {
  name: string
  logoUrl: string | null
  subtitle: string
  verified?: boolean
  trailing?: React.ReactNode
  onClick: () => void
  className?: string
}

export function BusinessCard({ name, logoUrl, subtitle, verified, trailing, onClick, className }: BusinessCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3.5 text-left',
        'transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
        className
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary/20 font-display font-semibold text-secondary-foreground">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate font-semibold text-foreground">{name}</p>
          {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {trailing}
    </button>
  )
}
