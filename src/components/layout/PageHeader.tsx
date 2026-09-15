import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** "hero" keeps a considered emerald-to-black band -- reserve for the one
   *  or two screens per app that deserve it (Home, the loyalty card).
   *  "flat" is the default for everything else, avoiding the old pattern
   *  of every screen opening with the same gradient wash. */
  variant?: 'hero' | 'flat'
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, variant = 'flat', action, className, children }: PageHeaderProps) {
  if (variant === 'hero') {
    return (
      <div className={cn('bg-flow-hero px-6 pb-8 pt-10', className)}>
        <div className="mx-auto flex max-w-md items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('px-6 pb-5 pt-8', className)}>
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold uppercase tracking-[0.06em] text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
