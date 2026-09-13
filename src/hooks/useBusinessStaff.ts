import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Business, BusinessStaff } from '@/types/database'

interface StaffContext {
  staff: BusinessStaff | null
  business: Business | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useBusinessStaff(): StaffContext {
  const { user } = useAuth()
  const [staff, setStaff] = React.useState<BusinessStaff | null>(null)
  const [business, setBusiness] = React.useState<Business | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    if (!user) {
      setStaff(null)
      setBusiness(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: staffRows } = await supabase
      .from('business_staff')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    const staffRow = staffRows?.[0] ?? null
    setStaff(staffRow)

    if (staffRow) {
      const { data: businessRow } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', staffRow.business_id)
        .single()
      setBusiness(businessRow)
    } else {
      setBusiness(null)
    }
    setLoading(false)
  }, [user])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return { staff, business, loading, refresh }
}
