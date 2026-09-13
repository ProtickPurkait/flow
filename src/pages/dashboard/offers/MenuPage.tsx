import * as React from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { ChevronLeft, Loader2, Plus, Trash2, UtensilsCrossed, GripVertical, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { Business, MenuCategory, MenuItem } from '@/types/database'

export default function MenuPage() {
  const { business } = useOutletContext<{ business: Business }>()
  const { toast } = useToast()
  const [categories, setCategories] = React.useState<MenuCategory[]>([])
  const [items, setItems] = React.useState<MenuItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addingCategory, setAddingCategory] = React.useState(false)
  const [uploadingId, setUploadingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('business_id', business.id).order('sort_order'),
      supabase.from('menu_items').select('*').eq('business_id', business.id).order('sort_order'),
    ])
    setCategories(catRes.data ?? [])
    setItems(itemRes.data ?? [])
    setLoading(false)
  }, [business.id])

  React.useEffect(() => {
    load()
  }, [load])

  const addCategory = async () => {
    setAddingCategory(true)
    const { error } = await supabase.from('menu_categories').insert({
      business_id: business.id,
      name: 'New Category',
      sort_order: categories.length,
    })
    setAddingCategory(false)
    if (error) toast({ title: 'Could not add category', description: error.message, variant: 'destructive' })
    else load()
  }

  const renameCategory = async (id: string, name: string) => {
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, name } : c)))
    await supabase.from('menu_categories').update({ name }).eq('id', id)
  }

  const deleteCategory = async (id: string) => {
    setCategories((cs) => cs.filter((c) => c.id !== id))
    setItems((is) => is.filter((i) => i.category_id !== id))
    await supabase.from('menu_categories').delete().eq('id', id)
  }

  const addItem = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        business_id: business.id,
        category_id: categoryId,
        name: 'New item',
        price: 0,
        is_available: true,
        sort_order: items.filter((i) => i.category_id === categoryId).length,
      })
      .select()
      .single()
    if (error) {
      toast({ title: 'Could not add item', description: error.message, variant: 'destructive' })
      return
    }
    setItems((is) => [...is, data])
  }

  const updateItem = (id: string, patch: Partial<MenuItem>) => {
    setItems((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const saveItem = async (item: MenuItem) => {
    await supabase
      .from('menu_items')
      .update({
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.is_available,
      })
      .eq('id', item.id)
  }

  const deleteItem = async (id: string) => {
    setItems((is) => is.filter((i) => i.id !== id))
    await supabase.from('menu_items').delete().eq('id', id)
  }

  const uploadItemImage = async (item: MenuItem, file: File) => {
    setUploadingId(item.id)
    const ext = file.name.split('.').pop()
    const path = `${business.id}/${item.id}.${ext}`
    const { error } = await supabase.storage.from('menu-item-images').upload(path, file, { upsert: true })
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' })
      setUploadingId(null)
      return
    }
    const { data } = supabase.storage.from('menu-item-images').getPublicUrl(path)
    const bustedUrl = `${data.publicUrl}?t=${Date.now()}`
    await supabase.from('menu_items').update({ image_url: bustedUrl }).eq('id', item.id)
    updateItem(item.id, { image_url: bustedUrl })
    setUploadingId(null)
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/dashboard/offers" className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to Menu
      </Link>

      <div>
        <h1 className="font-display text-xl font-bold">Digital Menu</h1>
        <p className="text-sm text-muted-foreground">Add categories, items, and photos one by one at your own pace.</p>
      </div>

      <Button variant="outline" disabled={addingCategory} onClick={addCategory}>
        {addingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add Category Manually
      </Button>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No categories yet</p>
            <p className="text-sm text-muted-foreground">Add a category to start building your menu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id)
            return (
              <Card key={cat.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      value={cat.name}
                      onChange={(e) => renameCategory(cat.id, e.target.value)}
                      className="h-9 flex-1 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat.id)}
                      aria-label={`Delete ${cat.name}`}
                      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {catItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border p-3">
                        <div className="mb-2 flex items-start gap-2">
                          <MenuItemImagePicker
                            item={item}
                            uploading={uploadingId === item.id}
                            onPick={(file) => uploadItemImage(item, file)}
                          />
                          <div className="flex flex-1 flex-col gap-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(item.id, { name: e.target.value })}
                              onBlur={() => saveItem(item)}
                              className="h-9"
                              placeholder="Item name"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price ?? ''}
                              onChange={(e) => updateItem(item.id, { price: e.target.value ? Number(e.target.value) : null })}
                              onBlur={() => saveItem(item)}
                              className="h-9 w-24"
                              placeholder="Price"
                            />
                          </div>
                        </div>
                        <Textarea
                          value={item.description ?? ''}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          onBlur={() => saveItem(item)}
                          placeholder="Description (optional)"
                          className="mb-2 min-h-[60px] text-sm"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={(v) => {
                                updateItem(item.id, { is_available: v })
                                saveItem({ ...item, is_available: v })
                              }}
                            />
                            <span className="text-xs font-semibold text-muted-foreground">Available</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            aria-label={`Delete ${item.name}`}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={() => addItem(cat.id)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add item
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MenuItemImagePicker({
  item,
  uploading,
  onPick,
}: {
  item: MenuItem
  uploading: boolean
  onPick: (file: File) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={item.image_url ? `Change photo for ${item.name}` : `Add photo for ${item.name}`}
        className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground hover:border-primary"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </button>
    </>
  )
}
