import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import gsap from 'gsap'
import { Loader2, Stamp, Clock, Compass, Gift, Phone, MapPin, PartyPopper, UtensilsCrossed, ChevronRight } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { useCustomerCard } from '@/hooks/useCustomerCard'
import { requestStamp } from '@/lib/customer'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { PhoneCapturePrompt } from '@/components/customer/PhoneCapturePrompt'
import { Button } from '@/components/ui/button'
import { StampGrid } from '@/components/customer/StampGrid'
import { EngagementPrompts } from '@/components/customer/EngagementPrompts'
import { ScratchWinCard } from '@/components/customer/ScratchWinCard'
import { BottomNav } from '@/components/layout/BottomNav'
import type { RewardRedemption } from '@/types/database'

export default function BusinessPage() {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()
  const { loading: accountLoading, registered, refresh: refreshAccount } = useCustomerAccount()
  const { card, loading, notFound, pendingStamp, setPendingStamp } = useCustomerCard(slug, registered)
  const [requesting, setRequesting] = React.useState(false)
  const [businessInfo, setBusinessInfo] = React.useState<{ phone: string | null; address: string | null } | null>(null)
  const [redemption, setRedemption] = React.useState<RewardRedemption | null>(null)
  const [hasScratchCards, setHasScratchCards] = React.useState(false)
  const [hasMenu, setHasMenu] = React.useState(false)
  const rewardRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!card?.business_id) return
    supabase
      .from('businesses')
      .select('phone, address')
      .eq('id', card.business_id)
      .maybeSingle()
      .then(({ data }) => setBusinessInfo(data))

    supabase
      .from('scratch_prizes')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', card.business_id)
      .eq('is_active', true)
      .then(({ count }) => setHasScratchCards(Boolean(count)))

    supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', card.business_id)
      .eq('is_available', true)
      .then(({ count }) => setHasMenu(Boolean(count)))
  }, [card?.business_id])

  const loadRedemption = React.useCallback(() => {
    if (!card?.membership_id) return
    supabase
      .from('reward_redemptions')
      .select('*')
      .eq('membership_id', card.membership_id)
      .is('redeemed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRedemption(data))
  }, [card?.membership_id])

  React.useEffect(() => {
    loadRedemption()
  }, [loadRedemption])

  React.useEffect(() => {
    if (!card?.membership_id) return
    const channel = supabase
      .channel(`business-redemption-${card.membership_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reward_redemptions', filter: `membership_id=eq.${card.membership_id}` },
        () => loadRedemption()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [card?.membership_id, loadRedemption])

  React.useEffect(() => {
    if (redemption && rewardRef.current) {
      gsap.fromTo(
        rewardRef.current,
        { scale: 0.92, opacity: 0, y: -8 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only replay the entrance animation when the code changes
  }, [redemption?.id])

  const handleCollect = async () => {
    if (!slug) return
    setRequesting(true)
    setPendingStamp(true)
    try {
      await requestStamp(slug)
    } catch (err) {
      setPendingStamp(false)
      toast({
        title: 'Could not request a stamp',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setRequesting(false)
    }
  }

  if (accountLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!registered) {
    return <PhoneCapturePrompt onRegistered={refreshAccount} />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (notFound || !card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Compass className="h-8 w-8 text-muted-foreground" />
        <p className="font-semibold">We couldn't load this business</p>
        <p className="text-sm text-muted-foreground">Try scanning the QR code again.</p>
      </div>
    )
  }

  const required = card.stamps_required ?? 0

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-flow-gradient px-6 pb-8 pt-10 text-white">
        <div className="mx-auto flex max-w-sm items-center gap-3">
          {card.logo_url ? (
            <img src={card.logo_url} alt={card.business_name} className="h-12 w-12 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 font-display text-lg font-bold">
              {card.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-lg font-bold">{card.business_name}</h1>
        </div>
        <p className="mx-auto mt-4 max-w-sm font-display text-3xl font-extrabold">
          {card.current_stamps} of {required} Stamps
        </p>
      </div>

      <div className="mx-auto -mt-4 flex max-w-sm flex-col gap-4 px-6">
        {redemption && (
          <div ref={rewardRef} className="flex items-center gap-3 rounded-2xl border-2 border-success/30 bg-success/5 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{card.reward_description}</p>
              <p className="text-xs text-muted-foreground">Show this code to staff to redeem</p>
            </div>
            <span className="shrink-0 font-mono text-lg font-extrabold tracking-wider text-success">
              {redemption.redemption_code}
            </span>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-card p-5 shadow-xl">
          <p className="mb-4 text-sm text-muted-foreground">
            {redemption
              ? 'Your reward is ready to claim above.'
              : `Collect ${Math.max(0, required - card.current_stamps)} more to unlock: ${card.reward_description}`}
          </p>
          <StampGrid current={card.current_stamps} required={required} />
        </div>

        {!redemption &&
          (pendingStamp ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-primary">
              <Clock className="h-4 w-4 animate-pulse" />
              Waiting for staff to approve…
            </div>
          ) : (
            <Button size="lg" onClick={handleCollect} disabled={requesting}>
              {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
              Collect stamp
            </Button>
          ))}

        {hasScratchCards && <ScratchWinCard businessSlug={slug!} />}

        {hasMenu && (
          <Link
            to={`/menu/${slug}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">View Menu</p>
                <p className="text-xs text-muted-foreground">See what's on offer</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {(businessInfo?.phone || businessInfo?.address) && (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Business info</p>
            {businessInfo.address && (
              <div className="flex items-center gap-3 p-4">
                <MapPin className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <p className="text-sm">{businessInfo.address}</p>
              </div>
            )}
            {businessInfo.phone && (
              <a
                href={`tel:${businessInfo.phone}`}
                className="flex items-center gap-3 border-t border-border p-4 transition-colors hover:bg-muted"
              >
                <Phone className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <p className="text-sm font-semibold">{businessInfo.phone}</p>
              </a>
            )}
          </div>
        )}

        {card.current_stamps > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Gift className="h-4 w-4" /> While you're here
            </div>
            <EngagementPrompts
              membershipId={card.membership_id}
              googleReviewUrl={card.google_review_url}
              instagramHandle={card.instagram_handle}
            />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
