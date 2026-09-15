import * as React from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { ChevronLeft, Loader2, Save, Plus, Minus, Trash2, Gift, Dices, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Business, ScratchPrize } from '@/types/database'

export default function ScratchCardPage() {
  const { business } = useOutletContext<{ business: Business }>()
  const { toast } = useToast()
  const [prizes, setPrizes] = React.useState<ScratchPrize[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [adding, setAdding] = React.useState(false)

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from('scratch_prizes')
      .select('*')
      .eq('business_id', business.id)
      .order('sort_order', { ascending: true })
    setPrizes(data ?? [])
    setLoading(false)
  }, [business.id])

  React.useEffect(() => {
    load()
  }, [load])

  const addPrize = async () => {
    setAdding(true)
    const { error } = await supabase.from('scratch_prizes').insert({
      business_id: business.id,
      title: 'New Prize',
      win_numerator: 1,
      win_denominator: 10,
      expiry_days: 30,
      is_active: true,
      sort_order: prizes.length,
    })
    setAdding(false)
    if (error) {
      toast({ title: 'Could not add prize', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Scratch card config created successfully', variant: 'success' })
    load()
  }

  const removePrize = async (id: string) => {
    setPrizes((ps) => ps.filter((p) => p.id !== id))
    const { error } = await supabase.from('scratch_prizes').delete().eq('id', id)
    if (error) toast({ title: 'Could not delete prize', description: error.message, variant: 'destructive' })
  }

  const updatePrize = (id: string, patch: Partial<ScratchPrize>) => {
    setPrizes((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const saveAll = async () => {
    setSaving(true)
    const results = await Promise.all(
      prizes.map((p) =>
        supabase
          .from('scratch_prizes')
          .update({
            title: p.title,
            win_numerator: p.win_numerator,
            win_denominator: p.win_denominator,
            expiry_days: p.expiry_days,
            is_active: p.is_active,
          })
          .eq('id', p.id)
      )
    )
    setSaving(false)
    const failed = results.find((r) => r.error)
    if (failed?.error) toast({ title: 'Could not save', description: failed.error.message, variant: 'destructive' })
    else toast({ title: 'All changes saved', variant: 'success' })
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Scratch Cards</h1>
          <p className="text-sm text-muted-foreground">Give random gifts to visitors.</p>
        </div>
        <Button size="sm" variant="outline" disabled={adding} onClick={addPrize}>
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add Prize
        </Button>
      </div>

      {prizes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Gift className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No scratch cards active.</p>
            <Button disabled={adding} onClick={addPrize}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Your First Scratch Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {prizes.map((p, idx) => (
            <Card key={p.id} className="relative">
              <button
                type="button"
                onClick={() => removePrize(p.id)}
                aria-label="Delete prize"
                className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between pr-10">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Prize #{idx + 1}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch checked={p.is_active} onCheckedChange={(v) => updatePrize(p.id, { is_active: v })} />
                  </div>
                </div>

                <div className="rounded-lg bg-amber-400/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-300">
                    <Dices className="h-3.5 w-3.5" />
                    Winning odds
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => updatePrize(p.id, { win_numerator: Math.max(1, p.win_numerator - 1) })}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center font-bold text-foreground">{p.win_numerator}</span>
                    <button
                      type="button"
                      onClick={() => updatePrize(p.id, { win_numerator: p.win_numerator + 1 })}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-muted-foreground">winners out of</span>
                    <button
                      type="button"
                      onClick={() => updatePrize(p.id, { win_denominator: Math.max(p.win_numerator, p.win_denominator - 1) })}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center font-bold text-foreground">{p.win_denominator}</span>
                    <button
                      type="button"
                      onClick={() => updatePrize(p.id, { win_denominator: p.win_denominator + 1 })}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-muted-foreground">scans</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">How it works:</span> if you set {p.win_numerator} winner
                    {p.win_numerator === 1 ? '' : 's'} out of {p.win_denominator} scans, every single scan has exactly{' '}
                    {Math.round((p.win_numerator / p.win_denominator) * 100)}% chance to win this prize. It is completely
                    random.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Prize expiry (days)</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={1}
                      value={p.expiry_days}
                      onChange={(e) => updatePrize(p.id, { expiry_days: Number(e.target.value) })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">Days</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reward title</Label>
                  <Input value={p.title} onChange={(e) => updatePrize(p.id, { title: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button size="lg" disabled={saving} onClick={saveAll}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      )}
    </div>
  )
}
