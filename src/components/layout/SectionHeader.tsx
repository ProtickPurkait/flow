import * as React from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
      {action}
    </div>
  )
}
