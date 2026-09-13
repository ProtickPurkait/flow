import * as React from 'react'
import gsap from 'gsap'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  current: number
  required: number
}

export function StampGrid({ current, required }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const prevCurrent = React.useRef(current)

  React.useEffect(() => {
    if (current > prevCurrent.current && containerRef.current) {
      const cells = containerRef.current.querySelectorAll('[data-stamp-cell]')
      const newest = cells[current - 1]
      if (newest) {
        gsap.fromTo(
          newest,
          { scale: 0.3, rotate: -12, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }
        )
      }
    }
    prevCurrent.current = current
  }, [current])

  return (
    <div ref={containerRef} className="grid grid-cols-5 gap-3 sm:grid-cols-6">
      {Array.from({ length: Math.max(required, 1) }).map((_, i) => {
        const filled = i < current
        return (
          <div
            key={i}
            data-stamp-cell
            className={cn(
              'flex aspect-square items-center justify-center rounded-full border-2 transition-colors',
              filled
                ? 'border-transparent bg-flow-gradient text-white shadow-md shadow-primary/30'
                : 'border-dashed border-border text-muted-foreground/40'
            )}
          >
            {filled ? <Check className="h-5 w-5 sm:h-6 sm:w-6" /> : <span className="text-xs font-semibold">{i + 1}</span>}
          </div>
        )
      })}
    </div>
  )
}
