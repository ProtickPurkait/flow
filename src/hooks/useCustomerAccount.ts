import * as React from 'react'
import { ensureCustomerSession, isRegistered } from '@/lib/customer'

export function useCustomerAccount() {
  const [loading, setLoading] = React.useState(true)
  const [registered, setRegistered] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    await ensureCustomerSession()
    const r = await isRegistered()
    setRegistered(r)
    setLoading(false)
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return { loading, registered, refresh }
}
