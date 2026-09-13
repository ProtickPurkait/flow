import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { ensureCustomerSession, joinBusiness } from '@/lib/customer'
import type { JoinBusinessResult } from '@/types/database'

export function useCustomerCard(slug: string | undefined, enabled = true) {
  const [card, setCard] = React.useState<JoinBusinessResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [pendingStamp, setPendingStamp] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!slug || !enabled) return
    setLoading(true)
    setNotFound(false)
    try {
      await ensureCustomerSession()
      const result = await joinBusiness(slug)
      setCard(result)

      const { data: pending } = await supabase
        .from('stamp_events')
        .select('id')
        .eq('membership_id', result.membership_id)
        .eq('status', 'pending')
        .maybeSingle()
      setPendingStamp(Boolean(pending))
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [slug, enabled])

  React.useEffect(() => {
    load()
  }, [load])

  React.useEffect(() => {
    if (!card?.membership_id) return

    const channel = supabase
      .channel(`membership-${card.membership_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'memberships', filter: `id=eq.${card.membership_id}` },
        (payload) => {
          const next = payload.new as { current_stamps: number; total_rewards_redeemed: number }
          setCard((prev) => (prev ? { ...prev, current_stamps: next.current_stamps, total_rewards_redeemed: next.total_rewards_redeemed } : prev))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stamp_events', filter: `membership_id=eq.${card.membership_id}` },
        (payload) => {
          const row = payload.new as { status: string } | undefined
          if (!row) return
          setPendingStamp(row.status === 'pending')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [card?.membership_id])

  return { card, loading, notFound, pendingStamp, setPendingStamp, refresh: load }
}
