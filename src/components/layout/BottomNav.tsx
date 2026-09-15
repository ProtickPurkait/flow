import * as React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Compass, Gift, User } from 'lucide-react'
import { QrScanner } from '@/components/customer/QrScanner'
import { ScanButton } from '@/components/layout/ScanButton'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass, end: false },
  { to: '/rewards', label: 'Rewards', icon: Gift, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

function NavItem({ to, end, icon: Icon, label }: (typeof NAV_ITEMS)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex w-16 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors"
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
          <span className={cn(isActive && 'text-primary')}>{label}</span>
          <span className={cn('h-1 w-1 rounded-full transition-opacity', isActive ? 'bg-primary opacity-100' : 'opacity-0')} />
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const [scannerOpen, setScannerOpen] = React.useState(false)
  const navigate = useNavigate()

  const handleDetect = (slug: string) => {
    setScannerOpen(false)
    navigate(`/b/${slug}`)
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/85 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-md items-center justify-between px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          <ScanButton onClick={() => setScannerOpen(true)} />

          {NAV_ITEMS.slice(2).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      {scannerOpen && <QrScanner onDetect={handleDetect} onClose={() => setScannerOpen(false)} />}
    </>
  )
}
