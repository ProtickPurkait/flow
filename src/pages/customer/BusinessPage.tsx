import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import gsap from 'gsap'
import { Loader2, Stamp, Clock, Compass, Gift, Phone, MapPin, PartyPopper, UtensilsCrossed, ChevronRight, Hourglass, IndianRupee, Users, Share2 } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { useCustomerCard } from '@/hooks/useCustomerCard'
import { requestStamp, getMyProfile } from '@/lib/customer'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { PhoneCapturePrompt, type BusinessPreview } from '@/components/customer/PhoneCapturePrompt'
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
  const [preview, setPreview] = React.useState<BusinessPreview | null>(null)
  const [referralCode, setReferralCode] = React.useState<string | null>(null)
  const rewardRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!slug || registered) return
    let cancelled = false
    supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
      .then(async ({ data: biz }) => {
        if (cancelled || !biz) return
        const { data: program } = await supabase
          .from('stamp_programs')
          .select('stamps_required, reward_description')
          .eq('business_id', biz.id)
          .eq('is_active', true)
          .maybeSingle()
        if (cancelled) return
        setPreview({
          name: biz.name,
          logoUrl: biz.logo_url,
          stampsRequired: program?.stamps_required ?? null,
          rewardDescription: program?.reward_description ?? null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [slug, registered])

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

  React.useEffect(() => {
    if (!registered) return
    getMyProfile().then((p) => setReferralCode(p?.referral_code ?? null))
  }, [registered])

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

  const shareReferral = async () => {
    if (!referralCode || !slug) return
    const url = `${window.location.origin}/b/${slug}?ref=${referralCode}`
    const text = `Join me on ${card?.business_name ?? 'this'}'s rewards program -- use my link and we both get a bonus stamp!`
    if (navigator.share) {
      try {
        await navigator.share({ text, url })
      } catch {
        // user cancelled the share sheet -- nothing to do
      }
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    toast({ title: 'Referral link copied', variant: 'success' })
  }

  if (accountLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!registered) {
    return <PhoneCapturePrompt onRegistered={refreshAccount} businessPreview={preview} />
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
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground">
          <Compass className="h-6 w-6" />
        </div>
        <p className="font-semibold text-foreground">We couldn't load this business</p>
        <p className="text-sm text-muted-foreground">Try scanning the QR code again.</p>
      </div>
    )
  }

  const required = card.stamps_required ?? 0

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="bg-flow-hero px-6 pb-8 pt-10">
        <div className="mx-auto flex max-w-sm items-center gap-3">
          {card.logo_url ? (
            <img src={card.logo_url} alt={card.business_name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/25 font-display text-lg font-semibold text-foreground">
              {card.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-lg font-semibold text-foreground">{card.business_name}</h1>
        </div>
        <p className="mx-auto mt-4 max-w-sm font-display text-3xl font-semibold text-foreground">
          <span className="text-primary">{card.current_stamps}</span> of {required} Stamps
        </p>
      </div>

      <div className="mx-auto -mt-4 flex max-w-sm flex-col gap-4 px-6">
        {redemption && (
          <div ref={rewardRef} className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{card.reward_description}</p>
              <p className="text-xs text-muted-foreground">Show this code to staff to redeem</p>
            </div>
            <span className="shrink-0 font-display text-lg font-semibold tracking-wider text-primary">
              {redemption.redemption_code}
            </span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            {redemption
              ? 'Your reward is ready to claim above.'
              : `Collect ${Math.max(0, required - card.current_stamps)} more to unlock: ${card.reward_description}`}
          </p>
          <StampGrid current={card.current_stamps} required={required} />
        </div>

        {!redemption && card.collection_deadline_at && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-300">
            <Hourglass className="h-4 w-4 shrink-0" />
            {(() => {
              const days = Math.ceil((new Date(card.collection_deadline_at).getTime() - Date.now()) / 86400000)
              return days > 0
                ? `Complete your card in ${days} day${days === 1 ? '' : 's'} or it resets`
                : 'Your card is about to expire'
            })()}
          </div>
        )}

        {!redemption &&
          (pendingStamp ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-primary">
              <Clock className="h-4 w-4 animate-pulse" />
              Waiting for staff to approve…
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={handleCollect} disabled={requesting}>
                {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                Collect stamp
              </Button>
              {card.minimum_order_value > 0 && (
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <IndianRupee className="h-3 w-3" />
                  Minimum order of ₹{card.minimum_order_value} &middot; staff will confirm before adding your stamp
                </p>
              )}
            </div>
          ))}

        {referralCode && (
          <button
            type="button"
            onClick={shareReferral}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Refer a friend</p>
                <p className="text-xs text-muted-foreground">You both get a bonus stamp when they join</p>
              </div>
            </div>
            <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}

        {hasScratchCards && <ScratchWinCard businessSlug={slug!} />}

        {hasMenu && (
          <Link
            to={`/menu/${slug}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">View Menu</p>
                <p className="text-xs text-muted-foreground">See what's on offer</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {(businessInfo?.phone || businessInfo?.address) && (
          <div className="rounded-lg border border-border bg-card">
            <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Business info</p>
            {businessInfo.address && (
              <div className="flex items-center gap-3 p-4">
                <MapPin className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-foreground">{businessInfo.address}</p>
              </div>
            )}
            {businessInfo.phone && (
              <a
                href={`tel:${businessInfo.phone}`}
                className="flex items-center gap-3 border-t border-border p-4 transition-colors hover:bg-muted"
              >
                <Phone className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">{businessInfo.phone}</p>
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
