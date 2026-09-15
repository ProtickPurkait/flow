import { cn } from '@/lib/utils'

interface CategoryChipProps {
  label: string
  selected: boolean
  onClick: () => void
}

export function CategoryChip({ label, selected, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
        selected
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
