import * as React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Compass, Gift, User, ScanLine } from 'lucide-react'
import { QrScanner } from '@/components/customer/QrScanner'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass, end: false },
  { to: '/rewards', label: 'Rewards', icon: Gift, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

export function BottomNav() {
  const [scannerOpen, setScannerOpen] = React.useState(false)
  const navigate = useNavigate()

  const handleDetect = (slug: string) => {
    setScannerOpen(false)
    navigate(`/b/${slug}`)
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-md items-center justify-between px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors',
                  isActive && 'text-primary'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}

          <button
            onClick={() => setScannerOpen(true)}
            className="flex h-14 w-14 shrink-0 -translate-y-4 cursor-pointer items-center justify-center rounded-full bg-flow-gradient text-white shadow-lg shadow-primary/40 transition-transform active:scale-95"
            aria-label="Scan QR code"
          >
            <ScanLine className="h-6 w-6" />
          </button>

          {NAV_ITEMS.slice(2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors',
                  isActive && 'text-primary'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {scannerOpen && <QrScanner onDetect={handleDetect} onClose={() => setScannerOpen(false)} />}
    </>
  )
}
