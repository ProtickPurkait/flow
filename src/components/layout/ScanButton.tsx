import { ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanButtonProps {
  onClick: () => void
  className?: string
}

/** The one gold circular moment in the nav -- deliberately not repeated
 *  elsewhere as a FAB style, per "gold communicates primary actions,
 *  not decoration." */
export function ScanButton({ onClick, className }: ScanButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Scan QR code"
      className={cn(
        'flex h-14 w-14 shrink-0 -translate-y-5 cursor-pointer items-center justify-center rounded-full',
        'bg-flow-gradient text-primary-foreground shadow-lg shadow-primary/20',
        'ring-4 ring-background transition-transform active:scale-95',
        className
      )}
    >
      <ScanLine className="h-6 w-6" />
    </button>
  )
}
