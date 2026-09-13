import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Gift } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { listMyRewards } from '@/lib/customer'
import { PhoneCapturePrompt } from '@/components/customer/PhoneCapturePrompt'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { MyRewardRow } from '@/types/database'

function RewardCard({ r }: { r: MyRewardRow }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/business/${r.business_slug}`)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.98]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-success/10 text-success">
        {r.logo_url ? (
          <img src={r.logo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Gift className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{r.business_name}</p>
        <p className="truncate text-sm text-muted-foreground">{r.reward_description}</p>
      </div>
      {r.redeemed_at ? (
        <Badge variant="outline">Redeemed</Badge>
      ) : (
        <Badge variant="success" className="font-mono">
          {r.redemption_code}
        </Badge>
      )}
    </button>
  )
}

export default function RewardsPage() {
  const { loading, registered, refresh } = useCustomerAccount()
  const [rewards, setRewards] = React.useState<MyRewardRow[] | null>(null)

  React.useEffect(() => {
    if (!registered) return
    listMyRewards().then(setRewards)
  }, [registered])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!registered) {
    return <PhoneCapturePrompt onRegistered={refresh} title="Sign in to see your rewards" />
  }

  const toClaim = rewards?.filter((r) => !r.redeemed_at) ?? []
  const history = rewards?.filter((r) => r.redeemed_at) ?? []

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-flow-gradient px-6 pb-8 pt-8 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-2xl font-bold">My Rewards</h1>
          <p className="text-sm text-white/80">Your earned treats and history</p>
        </div>
      </div>

      <div className="mx-auto -mt-4 max-w-md px-4">
        <Tabs defaultValue="claim" className="w-full">
          <TabsList className="mb-4 w-full justify-between">
            <TabsTrigger value="claim" className="flex-1">
              To Claim ({toClaim.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              History ({history.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claim">
            {rewards === null ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : toClaim.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
                <Gift className="h-7 w-7 text-muted-foreground" />
                <p className="font-semibold">No rewards yet</p>
                <p className="text-sm text-muted-foreground">You don't have any rewards to claim right now.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {toClaim.map((r) => (
                  <RewardCard key={r.redemption_id} r={r} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
                <Gift className="h-7 w-7 text-muted-foreground" />
                <p className="font-semibold">No history yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((r) => (
                  <RewardCard key={r.redemption_id} r={r} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
