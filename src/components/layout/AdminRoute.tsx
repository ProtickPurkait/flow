import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function AdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [checked, setChecked] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    // Wait for useAuth's own session load to finish first -- otherwise this
    // runs once with user still null, marks the check "done", and the real
    // session arriving a moment later gets redirected before its RPC result
    // comes back.
    if (loading) return

    if (!user) {
      setChecked(true)
      return
    }

    let cancelled = false
    supabase.rpc('is_super_admin').then(({ data }) => {
      if (cancelled) return
      setIsAdmin(Boolean(data))
      setChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [user, loading])

  if (loading || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
