import * as React from 'react'
import { Loader2, Plus, ShieldCheck, Navigation, Pencil, Trash2, MapPin, Phone, AlertTriangle, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BUSINESS_CATEGORIES } from '@/lib/categories'
import type { Business, BusinessStatus } from '@/types/database'

interface CreateResult {
  business: Business
  staff: { email: string; temporaryPassword: string }
}

interface ResetPasswordResult {
  email: string
  temporaryPassword: string
}

export default function AdminPage() {
  const { toast } = useToast()
  const [businesses, setBusinesses] = React.useState<Business[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<CreateResult | null>(null)

  const [form, setForm] = React.useState({
    name: '',
    ownerEmail: '',
    phone: '',
    address: '',
    stampsRequired: 8,
    rewardDescription: '',
    googleReviewUrl: '',
    instagramHandle: '',
    category: '',
    latitude: '',
    longitude: '',
    isVerified: false,
  })
  const [locating, setLocating] = React.useState(false)

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  const [editingBusiness, setEditingBusiness] = React.useState<Business | null>(null)
  const [editForm, setEditForm] = React.useState({
    name: '',
    phone: '',
    address: '',
    category: '',
    brandColor: '',
    googleReviewUrl: '',
    instagramHandle: '',
    latitude: '',
    longitude: '',
    isVerified: false,
    status: 'active' as BusinessStatus,
  })
  const [savingEdit, setSavingEdit] = React.useState(false)

  const [resettingPassword, setResettingPassword] = React.useState(false)
  const [resetResult, setResetResult] = React.useState<ResetPasswordResult | null>(null)

  const [deletingBusiness, setDeletingBusiness] = React.useState<Business | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const loadBusinesses = React.useCallback(async () => {
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false })
    setBusinesses(data ?? [])
    setLoading(false)
  }, [])

  const handleResetPassword = async () => {
    if (!editingBusiness) return
    setResettingPassword(true)
    setResetResult(null)
    const { data, error } = await supabase.functions.invoke<ResetPasswordResult>('admin-reset-password', {
      body: { businessId: editingBusiness.id },
    })
    setResettingPassword(false)
    if (error || !data) {
      toast({ title: 'Could not reset password', description: error?.message, variant: 'destructive' })
      return
    }
    setResetResult(data)
    toast({ title: 'Password reset', variant: 'success' })
  }

  const openEdit = (b: Business) => {
    setEditingBusiness(b)
    setResetResult(null)
    setEditForm({
      name: b.name,
      phone: b.phone ?? '',
      address: b.address ?? '',
      category: b.category ?? '',
      brandColor: b.brand_color,
      googleReviewUrl: b.google_review_url ?? '',
      instagramHandle: b.instagram_handle ?? '',
      latitude: b.latitude != null ? String(b.latitude) : '',
      longitude: b.longitude != null ? String(b.longitude) : '',
      isVerified: b.is_verified,
      status: b.status,
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBusiness) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('businesses')
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        address: editForm.address || null,
        category: editForm.category || null,
        brand_color: editForm.brandColor,
        google_review_url: editForm.googleReviewUrl || null,
        instagram_handle: editForm.instagramHandle || null,
        latitude: editForm.latitude ? Number(editForm.latitude) : null,
        longitude: editForm.longitude ? Number(editForm.longitude) : null,
        is_verified: editForm.isVerified,
        status: editForm.status,
      })
      .eq('id', editingBusiness.id)
    setSavingEdit(false)
    if (error) {
      toast({ title: 'Could not update business', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Business updated', variant: 'success' })
    setEditingBusiness(null)
    loadBusinesses()
  }

  const handleDelete = async () => {
    if (!deletingBusiness) return
    setDeleting(true)
    const { error } = await supabase.from('businesses').delete().eq('id', deletingBusiness.id)
    setDeleting(false)
    if (error) {
      toast({ title: 'Could not delete business', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: `${deletingBusiness.name} deleted`, variant: 'success' })
    setDeletingBusiness(null)
    loadBusinesses()
  }

  React.useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setLastResult(null)
    const { data, error } = await supabase.functions.invoke<CreateResult>('admin-create-business', {
      body: form,
    })
    setSubmitting(false)
    if (error || !data) {
      toast({ title: 'Could not create business', description: error?.message, variant: 'destructive' })
      return
    }
    setLastResult(data)
    toast({ title: `${data.business.name} created`, variant: 'success' })
    setForm({
      name: '',
      ownerEmail: '',
      phone: '',
      address: '',
      stampsRequired: 8,
      rewardDescription: '',
      googleReviewUrl: '',
      instagramHandle: '',
      category: '',
      latitude: '',
      longitude: '',
      isVerified: false,
    })
    loadBusinesses()
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flow-gradient text-white">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <h1 className="font-display text-xl font-bold">Fenlark Admin</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Onboard a new business</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Business name</Label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Owner email</Label>
              <Input
                type="email"
                required
                value={form.ownerEmail}
                onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Stamps required</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.stampsRequired}
                onChange={(e) => setForm((f) => ({ ...f, stampsRequired: Number(e.target.value) }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Instagram handle</Label>
              <Input
                placeholder="@business"
                value={form.instagramHandle}
                onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label>Google review link</Label>
              <Input
                type="url"
                value={form.googleReviewUrl}
                onChange={(e) => setForm((f) => ({ ...f, googleReviewUrl: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-input px-4">
              <Label className="text-sm">Verified business</Label>
              <Switch
                checked={form.isVerified}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isVerified: v }))}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Location (for Explore / distance sorting)</Label>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary"
                >
                  {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                  Use my current location
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude"
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                />
                <Input
                  placeholder="Longitude"
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label>Reward description</Label>
              <Textarea
                required
                placeholder="e.g. One free medium pizza"
                value={form.rewardDescription}
                onChange={(e) => setForm((f) => ({ ...f, rewardDescription: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={submitting} className="col-span-full self-start">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create business
            </Button>
          </form>

          {lastResult && (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
              <p className="font-semibold">{lastResult.business.name} is live at /b/{lastResult.business.slug}</p>
              <p className="mt-1 text-muted-foreground">
                Owner login: <span className="font-mono">{lastResult.staff.email}</span> / temp password{' '}
                <span className="font-mono">{lastResult.staff.temporaryPassword}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 font-display text-lg font-bold">All businesses</h2>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : businesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No businesses yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {businesses.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{b.name}</p>
                    {b.is_verified && <Badge variant="success">Verified</Badge>}
                    {b.category && <Badge variant="secondary">{b.category}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">/b/{b.slug}</p>
                  {(b.address || b.phone) && (
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {b.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {b.address}
                        </span>
                      )}
                      {b.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {b.phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={b.status === 'active' ? 'success' : 'warning'}>{b.status}</Badge>
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    aria-label={`Edit ${b.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingBusiness(b)}
                    aria-label={`Delete ${b.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingBusiness} onOpenChange={(open) => !open && setEditingBusiness(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editingBusiness?.name}</DialogTitle>
            <DialogDescription>/b/{editingBusiness?.slug}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Owner login</p>
              <Button type="button" variant="outline" size="sm" disabled={resettingPassword} onClick={handleResetPassword}>
                {resettingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Reset password
              </Button>
            </div>
            {resetResult && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                <p className="text-muted-foreground">
                  New password for <span className="font-mono font-semibold text-foreground">{resetResult.email}</span>:
                </p>
                <p className="mt-1 font-mono text-base font-bold tracking-wide text-foreground">
                  {resetResult.temporaryPassword}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Copy this now -- it can't be shown again once you close this dialog.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Business name</Label>
              <Input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as BusinessStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Instagram handle</Label>
              <Input
                placeholder="@business"
                value={editForm.instagramHandle}
                onChange={(e) => setEditForm((f) => ({ ...f, instagramHandle: e.target.value }))}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label>Google review link</Label>
              <Input
                type="url"
                value={editForm.googleReviewUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, googleReviewUrl: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-input px-4">
              <Label className="text-sm">Verified business</Label>
              <Switch checked={editForm.isVerified} onCheckedChange={(v) => setEditForm((f) => ({ ...f, isVerified: v }))} />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <Label>Location (for Explore / distance sorting)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude"
                  value={editForm.latitude}
                  onChange={(e) => setEditForm((f) => ({ ...f, latitude: e.target.value }))}
                />
                <Input
                  placeholder="Longitude"
                  value={editForm.longitude}
                  onChange={(e) => setEditForm((f) => ({ ...f, longitude: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={savingEdit} className="col-span-full self-start">
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingBusiness} onOpenChange={(open) => !open && setDeletingBusiness(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="mt-2">Delete {deletingBusiness?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the business along with its programs, customers' memberships, stamp history,
              and QR codes. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeletingBusiness(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete business
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
