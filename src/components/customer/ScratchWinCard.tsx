import * as React from 'react'
import gsap from 'gsap'
import { Sparkles, PartyPopper, Frown, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

interface ScratchWinCardProps {
  businessSlug: string
}

export function ScratchWinCard({ businessSlug }: ScratchWinCardProps) {
  const { toast } = useToast()
  const [drawing, setDrawing] = React.useState(false)
  const [result, setResult] = React.useState<{ won: boolean; prizeTitle: string | null } | null>(null)
  const resultRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (result && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { scale: 0.85, opacity: 0, rotate: -4 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.7)' }
      )
    }
  }, [result])

  const draw = async () => {
    setDrawing(true)
    setResult(null)
    try {
      const { data, error } = await supabase.rpc('draw_scratch_card', { p_business_slug: businessSlug })
      if (error) throw error
      const row = data?.[0]
      if (!row) throw new Error('No response')
      setResult({ won: row.won, prizeTitle: row.prize_title })
    } catch (err) {
      toast({
        title: 'Could not scratch right now',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setDrawing(false)
    }
  }

  if (result) {
    return (
      <div
        ref={resultRef}
        className={
          result.won
            ? 'flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4'
            : 'flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4'
        }
      >
        <div
          className={
            result.won
              ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary'
              : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'
          }
        >
          {result.won ? <PartyPopper className="h-5 w-5" /> : <Frown className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{result.won ? `You won: ${result.prizeTitle}` : 'Better luck next time!'}</p>
          <p className="text-xs text-muted-foreground">
            {result.won ? 'Show this screen to staff to claim your prize.' : 'Come back another day for another try.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Scratch &amp; Win</p>
          <p className="text-xs text-muted-foreground">Try your luck for an instant prize</p>
        </div>
      </div>
      <Button size="sm" disabled={drawing} onClick={draw} className="shrink-0">
        {drawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Scratch
      </Button>
    </div>
  )
}
