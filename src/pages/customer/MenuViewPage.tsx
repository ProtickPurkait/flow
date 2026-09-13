import * as React from 'react'
import { useParams } from 'react-router-dom'
import { Search, Phone, Loader2, UtensilsCrossed } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FlowLogo } from '@/components/brand/FlowLogo'
import type { Business, MenuCategory, MenuItem } from '@/types/database'

export default function MenuViewPage() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = React.useState<Business | null>(null)
  const [categories, setCategories] = React.useState<MenuCategory[]>([])
  const [items, setItems] = React.useState<MenuItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    if (!slug) return
    supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()
      .then(async ({ data: biz }) => {
        setBusiness(biz)
        if (biz) {
          const [catRes, itemRes] = await Promise.all([
            supabase.from('menu_categories').select('*').eq('business_id', biz.id).order('sort_order'),
            supabase.from('menu_items').select('*').eq('business_id', biz.id).eq('is_available', true).order('sort_order'),
          ])
          setCategories(catRes.data ?? [])
          setItems(itemRes.data ?? [])
        }
        setLoading(false)
      })
  }, [slug])

  const q = query.trim().toLowerCase()
  const filteredItems = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
        <p className="font-semibold">We couldn't find this menu</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-flow-gradient px-5 pb-4 pt-6 text-white">
        <div className="mx-auto flex max-w-sm items-center gap-3">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-display font-bold">
              {business.name.charAt(0)}
            </div>
          )}
          <p className="font-display text-lg font-bold">{business.name}</p>
        </div>
        <div className="relative mx-auto mt-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for dishes..."
            className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-9 pr-4 text-sm text-white outline-none placeholder:text-white/60"
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-5 py-6">
        {filteredItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No items available right now.</p>
          </div>
        ) : (
          categories.map((cat) => {
            const catItems = filteredItems.filter((i) => i.category_id === cat.id)
            if (catItems.length === 0) return null
            return (
              <div key={cat.id}>
                <h2 className="mb-3 font-display text-base font-bold">{cat.name}</h2>
                <div className="flex flex-col gap-3">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.name}</p>
                        {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      {item.price != null && <p className="shrink-0 font-display font-bold text-primary">₹{item.price}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-5 pb-8">
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-sm"
          >
            <Phone className="h-4 w-4" />
            {business.phone}
          </a>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <FlowLogo className="h-4 w-4" />
          Powered by Flow
        </div>
      </div>
    </div>
  )
}
