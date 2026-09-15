import { NavLink, Outlet } from 'react-router-dom'
import { LayoutGrid, Users, Gift, Settings, Loader2, User as UserIcon, ShieldCheck, BadgeCheck, Clock } from 'lucide-react'
import { useBusinessStaff } from '@/hooks/useBusinessStaff'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/winners', label: 'Winners', icon: Gift },
  { to: '/dashboard/offers', label: 'Create Offer', icon: Settings },
]

export function DashboardShell() {
  const { business, loading } = useBusinessStaff()
  const { isSuperAdmin } = useSuperAdmin()

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-lg">
        <header className="rounded-b-xl bg-flow-hero px-5 pb-5 pt-6 text-foreground">
          {loading ? (
            <div className="flex h-14 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !business ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold">
                  {isSuperAdmin ? "You're signed in as a Fenlark admin" : 'No business linked'}
                </p>
                {isSuperAdmin && (
                  <NavLink to="/admin" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Open Fenlark Admin
                  </NavLink>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary/25">
                  {business.logo_url ? (
                    <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-lg font-semibold">{business.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold leading-tight">{business.name}</p>
                  {business.is_verified && (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <NavLink
                to="/dashboard/settings"
                aria-label="Profile & Settings"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary/20 transition-colors hover:bg-secondary/30"
              >
                <UserIcon className="h-5 w-5" />
              </NavLink>
            </div>
          )}
        </header>

        {business && business.status === 'paused' && (
          <div className="mx-4 -mt-3 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3.5 text-xs text-amber-300 shadow-sm">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong className="font-semibold">Pending review.</strong> Set everything up now -- your customer page
              goes live once Fenlark activates your account.
            </span>
          </div>
        )}

        <main className="px-4 pt-5">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !business ? (
            !isSuperAdmin ? (
              <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-2 text-center">
                <p className="text-lg font-semibold">No business linked to this account</p>
                <p className="text-sm text-muted-foreground">
                  Ask Fenlark to confirm your staff account was set up correctly.
                </p>
              </div>
            ) : (
              <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  This account isn't staff on any single business -- manage every tenant from the admin panel instead.
                </p>
                <Button asChild className="mt-1">
                  <NavLink to="/admin">
                    <ShieldCheck className="h-4 w-4" />
                    Open Fenlark Admin
                  </NavLink>
                </Button>
              </div>
            )
          ) : (
            <Outlet context={{ business }} />
          )}
        </main>
      </div>

      {business && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors',
                    isActive && 'text-primary'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primary/10'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
