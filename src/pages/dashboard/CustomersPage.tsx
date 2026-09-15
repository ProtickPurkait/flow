import * as React from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, Loader2, Users2, Search, MessageCircle, Hourglass, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Business, BusinessCustomerRow } from '@/types/database'

type StatusFilter = 'all' | 'active' | 'completed'

function toCsv(rows: BusinessCustomerRow[]) {
  const header = ['Name', 'Phone', 'Current Stamps', 'Stamps Required', 'Rewards Redeemed', 'Joined', 'Last Visit']
  const lines = rows.map((r) =>
    [
      r.name ?? '',
      r.phone,
      r.current_stamps,
      r.stamps_required ?? '',
      r.total_rewards_redeemed,
      new Date(r.joined_at).toLocaleDateString(),
      r.last_visit_at ? new Date(r.last_visit_at).toLocaleDateString() : '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  return [header.join(','), ...lines].join('\n')
}

function daysLeft(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

export default function CustomersPage() {
  const { business } = useOutletContext<{ business: Business }>()
  const { toast } = useToast()
  const [rows, setRows] = React.useState<BusinessCustomerRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState<StatusFilter>('all')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')

  const [promoOpen, setPromoOpen] = React.useState(false)
  const [promoMessage, setPromoMessage] = React.useState('')
  const [sendingPromo, setSendingPromo] = React.useState(false)

  React.useEffect(() => {
    supabase.rpc('list_business_customers', { p_business_id: business.id }).then(({ data }) => {
      setRows(data ?? [])
      setLoading(false)
    })
  }, [business.id])

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (q && !(r.name ?? '').toLowerCase().includes(q) && !r.phone.includes(q)) return false

    if (status === 'active' && !(r.current_stamps > 0 && r.total_rewards_redeemed === 0)) return false
    if (status === 'completed' && r.total_rewards_redeemed === 0) return false

    const joined = new Date(r.joined_at)
    if (fromDate && joined < new Date(fromDate)) return false
    if (toDate && joined > new Date(`${toDate}T23:59:59`)) return false

    return true
  })

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${business.slug}-customers.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const sendPromo = async () => {
    if (!promoMessage.trim()) return
    setSendingPromo(true)
    const { data, error } = await supabase.rpc('send_promo_message', {
      p_business_id: business.id,
      p_message: promoMessage.trim(),
    })
    setSendingPromo(false)
    if (error) {
      toast({ title: 'Could not queue message', description: error.message, variant: 'destructive' })
      return
    }
    toast({
      title: `Queued for ${data} customer${data === 1 ? '' : 's'}`,
      description: 'Sends once WhatsApp is connected -- see Getting Started for setup.',
      variant: 'success',
    })
    setPromoMessage('')
    setPromoOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Customers</h1>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Message your customers</p>
              <p className="text-xs text-muted-foreground">Send a promo over WhatsApp to everyone on your card</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setPromoOpen(true)}>
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by phone or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
        <Download className="h-4 w-4" />
        Download CSV
      </Button>

      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'cursor-pointer rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors',
              status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Users2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No Customers yet</p>
            <p className="text-sm text-muted-foreground">Share your QR code to start building your customer base</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => {
            const left = r.collection_deadline_at ? daysLeft(r.collection_deadline_at) : null
            return (
              <Card key={r.customer_id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{r.name || r.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.phone} &middot; {r.current_stamps}
                      {r.stamps_required ? `/${r.stamps_required}` : ''} stamps
                      {r.total_rewards_redeemed > 0 ? ` · ${r.total_rewards_redeemed} redeemed` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {left != null && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                        <Hourglass className="h-3 w-3" />
                        {left > 0 ? `${left}d left` : 'expiring'}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {r.last_visit_at ? new Date(r.last_visit_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a promo message</DialogTitle>
            <DialogDescription>Queued as a WhatsApp message to every customer on your loyalty program.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Textarea
              value={promoMessage}
              onChange={(e) => setPromoMessage(e.target.value)}
              placeholder="e.g. We just added a Scratch & Win prize this weekend -- come collect your stamp!"
              className="min-h-[100px]"
              autoFocus
            />
            <Button disabled={sendingPromo || !promoMessage.trim()} onClick={sendPromo}>
              {sendingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Queue message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
