import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Navigation, BadgeCheck, Store, Loader2 } from 'lucide-react'
import { exploreBusinesses, ensureCustomerSession } from '@/lib/customer'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BUSINESS_CATEGORIES } from '@/lib/categories'
import type { ExploreBusinessRow } from '@/types/database'

const CATEGORIES = ['All', ...BUSINESS_CATEGORIES]

export default function ExplorePage() {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState('All')
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = React.useState(false)
  const [rows, setRows] = React.useState<ExploreBusinessRow[] | null>(null)

  const load = React.useCallback(async () => {
    await ensureCustomerSession()
    const data = await exploreBusinesses({
      query: query.trim() || undefined,
      category: category === 'All' ? undefined : category,
      lat: coords?.lat,
      lng: coords?.lng,
    })
    setRows(data)
  }, [query, category, coords])

  React.useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-flow-gradient px-6 pb-8 pt-8 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-2xl font-bold">Explore</h1>
          <p className="text-sm text-white/80">Find new favorites near you</p>
        </div>
      </div>

      <div className="mx-auto -mt-4 max-w-md px-4">
        <button
          onClick={useMyLocation}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-primary shadow-lg"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          {coords ? 'Using your location' : 'Use my current location'}
        </button>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Find businesses near you"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                category === c
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <h2 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {coords ? 'Nearby' : 'Trending'}
        </h2>

        {rows === null ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
            <Store className="h-7 w-7 text-muted-foreground" />
            <p className="font-semibold">No businesses found</p>
            <p className="text-sm text-muted-foreground">Try a different search or category.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/business/${b.slug}`)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 font-display font-bold text-primary">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    b.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate font-semibold">{b.name}</p>
                    {b.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {b.reward_description ? `Win: ${b.reward_description}` : b.category || 'Local business'}
                  </p>
                </div>
                {b.distance_km != null && (
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {b.distance_km < 1 ? `${Math.round(b.distance_km * 1000)}m` : `${b.distance_km.toFixed(1)}km`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
