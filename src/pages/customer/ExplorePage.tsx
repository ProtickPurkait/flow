import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Navigation, Store, Loader2 } from 'lucide-react'
import { exploreBusinesses, ensureCustomerSession } from '@/lib/customer'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { CategoryChip } from '@/components/customer/CategoryChip'
import { BusinessCard } from '@/components/customer/BusinessCard'
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
      <PageHeader title="Explore" subtitle="Find new favorites near you" />

      <div className="mx-auto max-w-md px-4">
        <button
          onClick={useMyLocation}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <CategoryChip key={c} label={c} selected={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>

        <div className="mt-6">
          <SectionHeader title={coords ? 'Nearby' : 'Trending'} />
        </div>

        {rows === null ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Store} title="No businesses found" description="Try a different search or category." />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((b) => (
              <BusinessCard
                key={b.id}
                name={b.name}
                logoUrl={b.logo_url}
                verified={b.is_verified}
                subtitle={b.reward_description ? `Win: ${b.reward_description}` : b.category || 'Local business'}
                onClick={() => navigate(`/business/${b.slug}`)}
                trailing={
                  b.distance_km != null && (
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {b.distance_km < 1 ? `${Math.round(b.distance_km * 1000)}m` : `${b.distance_km.toFixed(1)}km`}
                    </span>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
