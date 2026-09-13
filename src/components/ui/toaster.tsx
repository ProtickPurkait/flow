import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const icons = {
  default: Info,
  success: CheckCircle2,
  destructive: XCircle,
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:right-6 sm:left-auto">
      {toasts.map((t) => {
        const Icon = icons[t.variant]
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'animate-in slide-in-from-bottom-4 fade-in-0 pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl sm:w-96',
              t.variant === 'success' && 'border-success/30',
              t.variant === 'destructive' && 'border-destructive/30'
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                t.variant === 'success' && 'text-success',
                t.variant === 'destructive' && 'text-destructive',
                t.variant === 'default' && 'text-primary'
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="cursor-pointer rounded-md p-0.5 text-muted-foreground opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
