import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function useSuperAdmin() {
  const { user } = useAuth()
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase.rpc('is_super_admin').then(({ data }) => {
      if (cancelled) return
      setIsSuperAdmin(Boolean(data))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  return { isSuperAdmin, loading }
}
