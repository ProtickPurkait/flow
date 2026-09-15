import * as React from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import gsap from 'gsap'
import {
  Check,
  X,
  Zap,
  Users,
  Gift,
  Trophy,
  Loader2,
  Inbox,
  BadgeCheck,
  Copy,
  Download,
  IndianRupee,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MiniLineChart } from '@/components/dashboard/MiniLineChart'
import type {
  Business,
  StampProgram,
  PendingStampRequestRow,
  PendingRedemptionRow,
  BusinessStatsRow,
  DailyCountRow,
} from '@/types/database'

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DashboardHome() {
  const { business } = useOutletContext<{ business: Business }>()
  const { toast } = useToast()

  const [pending, setPending] = React.useState<PendingStampRequestRow[]>([])
  const [redemptions, setRedemptions] = React.useState<PendingRedemptionRow[]>([])
  const [program, setProgram] = React.useState<StampProgram | null>(null)
  const [stats, setStats] = React.useState<BusinessStatsRow | null>(null)
  const [weeklyScans, setWeeklyScans] = React.useState<DailyCountRow[]>([])
  const [growth, setGrowth] = React.useState<DailyCountRow[]>([])
  const [qrDataUrl, setQrDataUrl] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [staffId, setStaffId] = React.useState<string | null>(null)
  const [amountDrafts, setAmountDrafts] = React.useState<Record<string, string>>({})
  const listRef = React.useRef<HTMLDivElement>(null)

  const targetUrl = `${window.location.origin}/b/${business.slug}`

  const fetchAll = React.useCallback(async () => {
    const [pendingRes, redemptionsRes, programRes, statsRes, weeklyRes, growthRes] = await Promise.all([
      supabase.rpc('list_pending_stamp_requests', { p_business_id: business.id }),
      supabase.rpc('list_pending_redemptions', { p_business_id: business.id }),
      supabase.from('stamp_programs').select('*').eq('business_id', business.id).eq('is_active', true).maybeSingle(),
      supabase.rpc('get_business_stats', { p_business_id: business.id }),
      supabase.rpc('get_weekly_scans', { p_business_id: business.id }),
      supabase.rpc('get_customer_growth', { p_business_id: business.id }),
    ])
    setPending(pendingRes.data ?? [])
    setRedemptions(redemptionsRes.data ?? [])
    setProgram(programRes.data ?? null)
    setStats(statsRes.data?.[0] ?? null)
    setWeeklyScans(weeklyRes.data ?? [])
    setGrowth(growthRes.data ?? [])
    setLoading(false)
  }, [business.id])

  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: staffRow } = await supabase
        .from('business_staff')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('business_id', business.id)
        .single()
      setStaffId(staffRow?.id ?? null)
    })
  }, [business.id])

  React.useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel(`business-home-${business.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stamp_events', filter: `business_id=eq.${business.id}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reward_redemptions', filter: `business_id=eq.${business.id}` },
        () => fetchAll()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [business.id, fetchAll])

  React.useEffect(() => {
    QRCode.toDataURL(targetUrl, { width: 480, margin: 1, color: { dark: '#1E1B2E', light: '#FFFFFF' } }).then(setQrDataUrl)
  }, [targetUrl])

  React.useEffect(() => {
    if (!listRef.current || loading) return
    const items = listRef.current.querySelectorAll('[data-pending-item]')
    gsap.fromTo(
      items,
      { opacity: 0, y: 12, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out', stagger: 0.06 }
    )
  }, [pending, loading])

  const respond = async (eventId: string, approve: boolean, orderAmount?: number) => {
    setBusyId(eventId)
    const payload: Record<string, unknown> = { status: approve ? 'approved' : 'rejected', approved_by: staffId }
    if (approve && orderAmount != null) payload.order_amount = orderAmount
    const { error } = await supabase.from('stamp_events').update(payload).eq('id', eventId)
    if (error) {
      toast({
        title: 'Something went wrong',
        description: error.message.includes('row-level security')
          ? 'Order amount is below the minimum required for this stamp card.'
          : error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: approve ? 'Stamp approved' : 'Request rejected', variant: approve ? 'success' : 'default' })
      setAmountDrafts((d) => {
        const next = { ...d }
        delete next[eventId]
        return next
      })
    }
    setBusyId(null)
  }

  const markRedeemed = async (redemptionId: string) => {
    setBusyId(redemptionId)
    const { error } = await supabase
      .from('reward_redemptions')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('id', redemptionId)
    if (error) {
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Reward redeemed', variant: 'success' })
    }
    setBusyId(null)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(targetUrl)
    toast({ title: 'Link copied', variant: 'success' })
  }

  const downloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `${business.slug}-qr.png`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = [
    { label: 'Scans Today', value: stats?.scans_today ?? 0, icon: Zap, tone: 'text-success bg-success/10' },
    { label: 'Users', value: stats?.total_customers ?? 0, icon: Users, tone: 'text-primary bg-primary/15' },
    { label: 'Rewards', value: stats?.rewards_redeemed ?? 0, icon: Gift, tone: 'text-secondary-foreground bg-secondary/20' },
    { label: 'Repeat', value: `${stats?.repeat_rate ?? 0}%`, icon: Trophy, tone: 'text-amber-300 bg-amber-400/10' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col items-center gap-1.5 p-4 text-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <p className="text-xl font-semibold leading-none text-foreground">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Pending approvals</h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="h-7 w-7 text-muted-foreground" />
              <p className="font-semibold">All caught up</p>
              <p className="text-sm text-muted-foreground">New stamp requests will show up here in real time.</p>
            </CardContent>
          </Card>
        ) : (
          <div ref={listRef} className="flex flex-col gap-3">
            {pending.map((p) => {
              const requiresAmount = p.minimum_order_value > 0
              const draft = amountDrafts[p.stamp_event_id] ?? ''
              const draftAmount = Number(draft)
              const amountValid = draft.trim() !== '' && draftAmount >= p.minimum_order_value
              return (
                <Card key={p.stamp_event_id} data-pending-item>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{p.customer_name || p.customer_phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.current_stamps}
                          {p.stamps_required ? ` / ${p.stamps_required}` : ''} stamps &middot; requested{' '}
                          {new Date(p.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={busyId === p.stamp_event_id}
                          onClick={() => respond(p.stamp_event_id, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          disabled={busyId === p.stamp_event_id || (requiresAmount && !amountValid)}
                          onClick={() => respond(p.stamp_event_id, true, requiresAmount ? draftAmount : undefined)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {requiresAmount && (
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Input
                          type="number"
                          min={0}
                          placeholder={`Order amount (min ${p.minimum_order_value})`}
                          value={draft}
                          onChange={(e) => setAmountDrafts((d) => ({ ...d, [p.stamp_event_id]: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {redemptions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Ready to redeem</h2>
          <div className="flex flex-col gap-3">
            {redemptions.map((r) => (
              <Card key={r.redemption_id} className="border-primary/30">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{r.customer_name || r.customer_phone}</p>
                      <p className="text-xs text-muted-foreground">
                        Code <span className="font-mono font-semibold text-primary">{r.redemption_code}</span>
                      </p>
                    </div>
                  </div>
                  <Button size="sm" disabled={busyId === r.redemption_id} onClick={() => markRedeemed(r.redemption_id)}>
                    <BadgeCheck className="h-4 w-4" />
                    Mark redeemed
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-5">
          <p className="self-start text-lg font-semibold text-foreground">Your QR Code</p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code" className="h-44 w-44 rounded-lg border border-border" />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-border">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="text-base font-semibold text-foreground">{business.name}</p>
          <p className="text-xs text-muted-foreground">Scan to collect rewards</p>
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <Button className="flex-1" onClick={downloadQr}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-semibold text-foreground">Reward Programs</p>
            <Link to="/dashboard/offers/stamp-card" className="text-xs font-semibold text-primary">
              Edit
            </Link>
          </div>
          {program ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
                <Gift className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {program.stamps_required} stamps
                </p>
                <p className="truncate text-sm font-medium text-foreground">{program.reward_description}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active stamp program yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-base font-semibold text-foreground">Weekly Scans</p>
            <p className="text-xl font-semibold text-primary">
              {weeklyScans.reduce((sum, d) => sum + (d.scans ?? 0), 0)}
            </p>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Last 7 days activity</p>
          <MiniLineChart points={weeklyScans.map((d) => ({ label: dayLabel(d.day), value: d.scans ?? 0 }))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-base font-semibold text-foreground">Customer Growth</p>
            <p className="text-xl font-semibold text-primary">
              {growth[growth.length - 1]?.total_customers ?? 0}
            </p>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Total customers over time</p>
          <MiniLineChart
            points={growth.map((d) => ({ label: dayLabel(d.day), value: d.total_customers ?? 0 }))}
            color="hsl(var(--secondary))"
          />
        </CardContent>
      </Card>
    </div>
  )
}
