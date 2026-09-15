import { cn } from '@/lib/utils'

interface FlowLogoProps {
  className?: string
}

export function FlowLogo({ className }: FlowLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9', className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Fenlark Flow"
    >
      <rect width="64" height="64" rx="14" fill="hsl(var(--background))" />
      <path d="M16 14 L48 14 L48 24 L28 24 L28 44 L16 54 Z" fill="hsl(var(--secondary))" />
      <rect x="16" y="28" width="20" height="10" fill="hsl(var(--secondary))" />
      <circle cx="45" cy="33" r="4.5" fill="hsl(var(--primary))" />
    </svg>
  )
}
