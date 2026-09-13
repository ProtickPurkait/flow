import * as React from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { ChevronLeft, Loader2, Save, Minus, Plus, Calendar, Gift } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { Business, StampProgram } from '@/types/database'

export default function StampCardPage() {
  const { business } = useOutletContext<{ business: Business }>()
  const { toast } = useToast()
  const [program, setProgram] = React.useState<StampProgram | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [active, setActive] = React.useState(true)
  const [stampsRequired, setStampsRequired] = React.useState(8)
  const [rewardExpiryDays, setRewardExpiryDays] = React.useState(30)
  const [rewardDescription, setRewardDescription] = React.useState('')

  React.useEffect(() => {
    supabase
      .from('stamp_programs')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProgram(data)
          setActive(data.is_active)
          setStampsRequired(data.stamps_required)
          setRewardExpiryDays(data.reward_expiry_days)
          setRewardDescription(data.reward_description)
        }
        setLoading(false)
      })
  }, [business.id])

  const handleSave = async () => {
    if (!program) return
    setSaving(true)
    const { error } = await supabase
      .from('stamp_programs')
      .update({
        is_active: active,
        stamps_required: stampsRequired,
        reward_expiry_days: rewardExpiryDays,
        reward_description: rewardDescription,
      })
      .eq('id', program.id)
    setSaving(false)
    if (error) toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
    else toast({ title: 'Reward Programs saved', variant: 'success' })
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
        <h1 className="font-display text-xl font-bold">Reward Programs</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {active ? 'Active' : 'Inactive'}
          </span>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Visits required</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStampsRequired((n) => Math.max(1, n - 1))}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/70"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-display text-lg font-bold">{stampsRequired}</span>
              <button
                type="button"
                onClick={() => setStampsRequired((n) => Math.min(50, n + 1))}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reward day expiry</Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={1}
                value={rewardExpiryDays}
                onChange={(e) => setRewardExpiryDays(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">Days</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reward description</Label>
            <Textarea
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="e.g. Get 5% discount on your total bill after 8 visits"
            />
          </div>
        </CardContent>
      </Card>

      <Button disabled={saving} onClick={handleSave} size="lg">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Reward Programs
      </Button>

      <Card className="overflow-hidden">
        <div className="bg-flow-gradient p-5 text-white">
          <div className="mb-4 flex items-center gap-2">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {business.name.charAt(0)}
              </div>
            )}
            <p className="font-display font-bold">{business.name}</p>
          </div>
          <p className="font-display text-2xl font-bold">0 of {stampsRequired} Stamps</p>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Gift className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">{stampsRequired} stamps</p>
              <p className="truncate text-sm font-medium">{rewardDescription || 'Set your reward description'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
