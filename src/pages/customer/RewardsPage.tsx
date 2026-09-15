import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Gift } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { listMyRewards } from '@/lib/customer'
import { PhoneCapturePrompt } from '@/components/customer/PhoneCapturePrompt'
import { RewardCard } from '@/components/customer/RewardCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { MyRewardRow } from '@/types/database'

export default function RewardsPage() {
  const { loading, registered, refresh } = useCustomerAccount()
  const [rewards, setRewards] = React.useState<MyRewardRow[] | null>(null)
  const navigate = useNavigate()

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
      <PageHeader title="My Rewards" subtitle="Your earned treats and history" />

      <div className="mx-auto max-w-md px-4">
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
              <EmptyState
                icon={Gift}
                title="No rewards yet"
                description="You don't have any rewards to claim right now."
                action={
                  <Button variant="link" size="sm" onClick={() => navigate('/explore')} className="mt-1">
                    Explore Nearby &rarr;
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {toClaim.map((r) => (
                  <RewardCard
                    key={r.redemption_id}
                    businessName={r.business_name}
                    logoUrl={r.logo_url}
                    description={r.reward_description ?? ''}
                    redeemed={false}
                    redemptionCode={r.redemption_code}
                    onClick={() => navigate(`/business/${r.business_slug}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {history.length === 0 ? (
              <EmptyState icon={Gift} title="No history yet" />
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((r) => (
                  <RewardCard
                    key={r.redemption_id}
                    businessName={r.business_name}
                    logoUrl={r.logo_url}
                    description={r.reward_description ?? ''}
                    redeemed
                    redemptionCode={r.redemption_code}
                    onClick={() => navigate(`/business/${r.business_slug}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
