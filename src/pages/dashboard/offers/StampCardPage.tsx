import * as React from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { ChevronLeft, Loader2, Save, Minus, Plus, Calendar, Gift, Hourglass, MessageCircle, IndianRupee, Cake } from 'lucide-react'
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
  const [deadlineEnabled, setDeadlineEnabled] = React.useState(false)
  const [deadlineDays, setDeadlineDays] = React.useState(90)
  const [minOrderEnabled, setMinOrderEnabled] = React.useState(false)
  const [minOrderValue, setMinOrderValue] = React.useState(100)
  const [welcomeTemplate, setWelcomeTemplate] = React.useState('')
  const [reminderTemplate, setReminderTemplate] = React.useState('')
  const [expiredTemplate, setExpiredTemplate] = React.useState('')
  const [birthdayEnabled, setBirthdayEnabled] = React.useState(false)
  const [birthdayTemplate, setBirthdayTemplate] = React.useState('')

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
          setDeadlineEnabled(data.collection_deadline_enabled)
          setDeadlineDays(data.collection_deadline_days)
          setMinOrderEnabled(data.minimum_order_value > 0)
          if (data.minimum_order_value > 0) setMinOrderValue(data.minimum_order_value)
          setWelcomeTemplate(data.welcome_message_template)
          setReminderTemplate(data.deadline_reminder_template)
          setExpiredTemplate(data.card_expired_template)
          setBirthdayEnabled(data.birthday_message_enabled)
          setBirthdayTemplate(data.birthday_message_template)
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
        collection_deadline_enabled: deadlineEnabled,
        collection_deadline_days: deadlineDays,
        minimum_order_value: minOrderEnabled ? minOrderValue : 0,
        welcome_message_template: welcomeTemplate,
        deadline_reminder_template: reminderTemplate,
        card_expired_template: expiredTemplate,
        birthday_message_enabled: birthdayEnabled,
        birthday_message_template: birthdayTemplate,
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
        <h1 className="text-xl font-semibold text-foreground">Reward Programs</h1>
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
              <span className="w-10 text-center text-lg font-semibold text-foreground">{stampsRequired}</span>
              <button
                type="button"
                onClick={() => setStampsRequired((n) => Math.min(50, n + 1))}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:brightness-105"
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

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Minimum order value</p>
                <p className="text-xs text-muted-foreground">Only approve a stamp if the order meets this amount</p>
              </div>
            </div>
            <Switch checked={minOrderEnabled} onCheckedChange={setMinOrderEnabled} />
          </div>

          {minOrderEnabled && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Minimum order amount
                </Label>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={1}
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-28"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-success/5 p-3 text-xs text-muted-foreground">
                <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <span>
                  Staff will enter the order amount when approving a stamp request, so Auto Approve Scans is
                  skipped for this program while this is on -- every scan needs a human to confirm the total.
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                <Cake className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Birthday reward</p>
                <p className="text-xs text-muted-foreground">A bonus stamp + WhatsApp message on a customer's birthday</p>
              </div>
            </div>
            <Switch checked={birthdayEnabled} onCheckedChange={setBirthdayEnabled} />
          </div>

          {birthdayEnabled && (
            <>
              <div className="flex items-start gap-2 rounded-xl bg-amber-400/5 p-3 text-xs text-muted-foreground">
                <Cake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>
                  Only customers who've added their birthday in their profile are included -- it's never asked for
                  at registration.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Birthday message
                </Label>
                <Textarea
                  value={birthdayTemplate}
                  onChange={(e) => setBirthdayTemplate(e.target.value)}
                  className="min-h-[80px]"
                />
                <PlaceholderChips tokens={['{business_name}']} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">Welcome message</p>
              <p className="text-xs text-muted-foreground">Sent over WhatsApp the moment someone joins</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={welcomeTemplate}
              onChange={(e) => setWelcomeTemplate(e.target.value)}
              className="min-h-[80px]"
            />
            <PlaceholderChips tokens={['{business_name}', '{stamps_required}', '{reward_description}']} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                <Hourglass className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Time-bound collection</p>
                <p className="text-xs text-muted-foreground">Require the full card within a deadline, or it resets</p>
              </div>
            </div>
            <Switch checked={deadlineEnabled} onCheckedChange={setDeadlineEnabled} />
          </div>

          {deadlineEnabled && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Days to complete, from the first stamp
                </Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={1}
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">Days (90 &asymp; 3 months)</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-amber-400/5 p-3 text-xs text-muted-foreground">
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>
                  Once WhatsApp is connected, these messages send automatically -- reminders at 7, 3, and 1 day
                  before a card expires, and a notice if it does. Write them however you like.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Deadline reminder (sent at 7, 3, and 1 day left)
                </Label>
                <Textarea
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="min-h-[90px]"
                />
                <PlaceholderChips
                  tokens={['{days_left}', '{days_unit}', '{business_name}', '{current_stamps}', '{stamps_required}']}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Card expired notice
                </Label>
                <Textarea
                  value={expiredTemplate}
                  onChange={(e) => setExpiredTemplate(e.target.value)}
                  className="min-h-[80px]"
                />
                <PlaceholderChips tokens={['{business_name}']} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button disabled={saving} onClick={handleSave} size="lg">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Reward Programs
      </Button>

      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer preview</p>
      <Card className="overflow-hidden">
        <div className="bg-flow-hero p-5">
          <div className="mb-4 flex items-center gap-2">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/25 text-sm font-semibold text-foreground">
                {business.name.charAt(0)}
              </div>
            )}
            <p className="font-display font-semibold text-foreground">{business.name}</p>
          </div>
          <p className="font-display text-2xl font-semibold text-foreground">
            <span className="text-primary">0</span> of {stampsRequired} Stamps
          </p>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Gift className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{stampsRequired} stamps</p>
              <p className="truncate text-sm font-medium text-foreground">{rewardDescription || 'Set your reward description'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlaceholderChips({ tokens }: { tokens: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tokens.map((t) => (
        <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {t}
        </span>
      ))}
    </div>
  )
}
