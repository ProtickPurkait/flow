import * as React from 'react'
import { useOutletContext } from 'react-router-dom'
import { Gift, Sparkles, Search, Loader2, BadgeCheck, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  Business,
  PendingRedemptionRow,
  ClaimedRedemptionRow,
  PendingScratchWinRow,
  ClaimedScratchWinRow,
} from '@/types/database'

type Tab = 'stamp' | 'scratch'

export default function WinnersPage() {
  const { business } = useOutletContext<{ business: Business }>()
  const { toast } = useToast()
  const [tab, setTab] = React.useState<Tab>('stamp')
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const [pendingStamp, setPendingStamp] = React.useState<PendingRedemptionRow[]>([])
  const [claimedStamp, setClaimedStamp] = React.useState<ClaimedRedemptionRow[]>([])
  const [pendingScratch, setPendingScratch] = React.useState<PendingScratchWinRow[]>([])
  const [claimedScratch, setClaimedScratch] = React.useState<ClaimedScratchWinRow[]>([])

  const load = React.useCallback(async () => {
    const [pr, cr, ps, cs] = await Promise.all([
      supabase.rpc('list_pending_redemptions', { p_business_id: business.id }),
      supabase.rpc('list_claimed_redemptions', { p_business_id: business.id }),
      supabase.rpc('list_pending_scratch_wins', { p_business_id: business.id }),
      supabase.rpc('list_claimed_scratch_wins', { p_business_id: business.id }),
    ])
    setPendingStamp(pr.data ?? [])
    setClaimedStamp(cr.data ?? [])
    setPendingScratch(ps.data ?? [])
    setClaimedScratch(cs.data ?? [])
    setLoading(false)
  }, [business.id])

  React.useEffect(() => {
    load()
    const channel = supabase
      .channel(`business-winners-${business.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_redemptions', filter: `business_id=eq.${business.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scratch_draws', filter: `business_id=eq.${business.id}` }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [business.id, load])

  const markRedeemed = async (redemptionId: string) => {
    setBusyId(redemptionId)
    const { error } = await supabase
      .from('reward_redemptions')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('id', redemptionId)
    if (error) toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' })
    else toast({ title: 'Reward redeemed', variant: 'success' })
    setBusyId(null)
  }

  const claimScratch = async (drawId: string) => {
    setBusyId(drawId)
    const { error } = await supabase.rpc('claim_scratch_win', { p_draw_id: drawId })
    if (error) toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' })
    else toast({ title: 'Prize claimed', variant: 'success' })
    setBusyId(null)
  }

  const q = query.trim().toLowerCase()
  const matches = (name: string | null, phone: string) =>
    !q || (name ?? '').toLowerCase().includes(q) || phone.includes(q)

  const stampPending = pendingStamp.filter((r) => matches(r.customer_name, r.customer_phone))
  const stampClaimed = claimedStamp.filter((r) => matches(r.customer_name, r.customer_phone))
  const scratchPending = pendingScratch.filter((r) => matches(r.customer_name, r.customer_phone))
  const scratchClaimed = claimedScratch.filter((r) => matches(r.customer_name, r.customer_phone))

  const isEmpty =
    tab === 'stamp' ? stampPending.length === 0 && stampClaimed.length === 0 : scratchPending.length === 0 && scratchClaimed.length === 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Winners</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('stamp')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
            tab === 'stamp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          <Gift className="h-4 w-4" />
          Stamp Cards
          <span className={cn('rounded-full px-1.5 text-xs', tab === 'stamp' ? 'bg-primary-foreground/20' : 'bg-card')}>
            {pendingStamp.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('scratch')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors',
            tab === 'scratch' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          Scratch Cards
          <span className={cn('rounded-full px-1.5 text-xs', tab === 'scratch' ? 'bg-primary-foreground/20' : 'bg-card')}>
            {pendingScratch.length}
          </span>
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Shows <span className="font-semibold text-foreground">claimed rewards</span>. Requests requiring action are shown at the top.
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Gift className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No {tab === 'stamp' ? 'claimed rewards' : 'scratch wins'} yet.</p>
          </CardContent>
        </Card>
      ) : tab === 'stamp' ? (
        <div className="flex flex-col gap-2">
          {stampPending.map((r) => (
            <Card key={r.redemption_id} className="border-primary/30">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.customer_name || r.customer_phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Code <span className="font-mono font-semibold text-foreground">{r.redemption_code}</span>
                  </p>
                </div>
                <Button size="sm" disabled={busyId === r.redemption_id} onClick={() => markRedeemed(r.redemption_id)}>
                  <BadgeCheck className="h-4 w-4" />
                  Redeem
                </Button>
              </CardContent>
            </Card>
          ))}
          {stampClaimed.map((r) => (
            <Card key={r.redemption_id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.customer_name || r.customer_phone}</p>
                  <p className="text-xs text-muted-foreground">Code {r.redemption_code}</p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scratchPending.map((r) => (
            <Card key={r.draw_id} className="border-primary/30">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.customer_name || r.customer_phone}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.prize_title}</p>
                </div>
                <Button size="sm" disabled={busyId === r.draw_id} onClick={() => claimScratch(r.draw_id)}>
                  <BadgeCheck className="h-4 w-4" />
                  Claim
                </Button>
              </CardContent>
            </Card>
          ))}
          {scratchClaimed.map((r) => (
            <Card key={r.draw_id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.customer_name || r.customer_phone}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.prize_title}</p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{new Date(r.claimed_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
