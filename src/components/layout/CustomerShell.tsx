import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'

export function CustomerShell() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Outlet />
      <BottomNav />
    </div>
  )
}
