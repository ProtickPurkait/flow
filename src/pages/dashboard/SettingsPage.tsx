import * as React from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Loader2,
  Save,
  Upload,
  Building2,
  Navigation,
  MapPin,
  Phone,
  Instagram,
  ShieldCheck,
  RefreshCw,
  Pencil,
  LogOut,
  MessageCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/image'
import { useAuth } from '@/hooks/useAuth'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BUSINESS_CATEGORIES } from '@/lib/categories'
import type { Business, WhatsappConfig, WhatsappProvider } from '@/types/database'

type Section = 'identity' | 'location' | 'contact' | 'social' | 'whatsapp' | null

const WHATSAPP_PROVIDER_LABELS: Record<WhatsappProvider, string> = {
  meta_cloud: 'Meta Cloud API',
  twilio: 'Twilio',
  gupshup: 'Gupshup',
}

const WHATSAPP_PROVIDER_FIELDS: Record<
  WhatsappProvider,
  { key: string; label: string; placeholder: string; secret?: boolean }[]
> = {
  meta_cloud: [
    { key: 'phone_number_id', label: 'Phone number ID', placeholder: 'e.g. 109876543210123' },
    { key: 'access_token', label: 'Access token', placeholder: 'Permanent access token', secret: true },
  ],
  twilio: [
    { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { key: 'auth_token', label: 'Auth token', placeholder: 'Your Twilio auth token', secret: true },
    { key: 'from_number', label: 'WhatsApp sender number', placeholder: '+14155238886' },
  ],
  gupshup: [
    { key: 'api_key', label: 'API key', placeholder: 'Your Gupshup API key', secret: true },
    { key: 'source_number', label: 'Source number', placeholder: '+919876543210' },
    { key: 'app_name', label: 'App name', placeholder: 'Your Gupshup app name' },
  ],
}

export default function SettingsPage() {
  const { business } = useOutletContext<{ business: Business }>()
  const { signOut } = useAuth()
  const { isSuperAdmin } = useSuperAdmin()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [logoUrl, setLogoUrl] = React.useState(business.logo_url)
  const [uploading, setUploading] = React.useState(false)
  const [locating, setLocating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [openSection, setOpenSection] = React.useState<Section>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [form, setForm] = React.useState({
    name: business.name,
    category: business.category ?? '',
    address: business.address ?? '',
    hours: business.hours ?? '',
    latitude: business.latitude != null ? String(business.latitude) : '',
    longitude: business.longitude != null ? String(business.longitude) : '',
    phone: business.phone ?? '',
    email: business.email ?? '',
    google_review_url: business.google_review_url ?? '',
    instagram_handle: business.instagram_handle ?? '',
  })
  const [autoApprove, setAutoApprove] = React.useState(business.auto_approve_scans)
  const [allowMultiple, setAllowMultiple] = React.useState(business.allow_multiple_scans_per_day)

  const [whatsappConfig, setWhatsappConfig] = React.useState<WhatsappConfig | null>(null)
  const [whatsappProvider, setWhatsappProvider] = React.useState<WhatsappProvider>('meta_cloud')
  const [whatsappCreds, setWhatsappCreds] = React.useState<Record<string, string>>({})
  const [whatsappActive, setWhatsappActive] = React.useState(false)
  const [savingWhatsapp, setSavingWhatsapp] = React.useState(false)

  React.useEffect(() => {
    supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWhatsappConfig(data)
          setWhatsappProvider(data.provider)
          setWhatsappCreds(data.credentials ?? {})
          setWhatsappActive(data.is_active)
        }
      })
  }, [business.id])

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return
    setUploading(true)
    const file = await compressImage(rawFile)
    const ext = file.name.split('.').pop()
    const path = `${business.id}/logo.${ext}`
    const { error } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true })
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' })
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('business-logos').getPublicUrl(path)
    const bustedUrl = `${data.publicUrl}?t=${Date.now()}`
    await supabase.from('businesses').update({ logo_url: bustedUrl }).eq('id', business.id)
    setLogoUrl(bustedUrl)
    setUploading(false)
    toast({ title: 'Logo updated', variant: 'success' })
  }

  const saveSection = async (fields: Partial<typeof form>) => {
    setSaving(true)
    const payload: Record<string, unknown> = { ...fields }
    if ('category' in fields) payload.category = fields.category || null
    if ('latitude' in fields) payload.latitude = fields.latitude ? Number(fields.latitude) : null
    if ('longitude' in fields) payload.longitude = fields.longitude ? Number(fields.longitude) : null
    const { error } = await supabase.from('businesses').update(payload).eq('id', business.id)
    setSaving(false)
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
      return false
    }
    toast({ title: 'Saved', variant: 'success' })
    setOpenSection(null)
    return true
  }

  const toggleAutoApprove = async (v: boolean) => {
    setAutoApprove(v)
    const { error } = await supabase.from('businesses').update({ auto_approve_scans: v }).eq('id', business.id)
    if (error) {
      setAutoApprove(!v)
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
    }
  }

  const toggleAllowMultiple = async (v: boolean) => {
    setAllowMultiple(v)
    const { error } = await supabase.from('businesses').update({ allow_multiple_scans_per_day: v }).eq('id', business.id)
    if (error) {
      setAllowMultiple(!v)
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const saveWhatsappConfig = async () => {
    setSavingWhatsapp(true)
    const { data, error } = await supabase
      .from('whatsapp_configs')
      .upsert(
        {
          business_id: business.id,
          provider: whatsappProvider,
          credentials: whatsappCreds,
          is_active: whatsappActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' }
      )
      .select()
      .single()
    setSavingWhatsapp(false)
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' })
      return
    }
    setWhatsappConfig(data)
    toast({ title: 'WhatsApp settings saved', variant: 'success' })
    setOpenSection(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-bold">Profile &amp; Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business and account</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{business.name}</p>
            <p className="text-sm text-muted-foreground">{business.category || 'No category set'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpenSection('identity')}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </CardContent>
      </Card>

      <SettingsRow
        icon={MapPin}
        tone="text-success bg-success/10"
        title="Location & Hours"
        subtitle={business.address || 'Manage your address and timing'}
        onEdit={() => setOpenSection('location')}
      />
      <SettingsRow
        icon={Phone}
        tone="text-primary bg-primary/10"
        title="Phone & Email"
        subtitle={business.email || 'No email address set'}
        onEdit={() => setOpenSection('contact')}
      />
      <SettingsRow
        icon={Instagram}
        tone="text-secondary bg-secondary/10"
        title="Social Links & Reviews"
        subtitle="Manage your online presence"
        onEdit={() => setOpenSection('social')}
      />
      <SettingsRow
        icon={MessageCircle}
        tone="text-success bg-success/10"
        title="WhatsApp Business API"
        subtitle={
          whatsappConfig?.is_active
            ? `Connected · ${WHATSAPP_PROVIDER_LABELS[whatsappConfig.provider]}`
            : whatsappConfig
              ? `Saved but inactive · ${WHATSAPP_PROVIDER_LABELS[whatsappConfig.provider]}`
              : 'Not connected'
        }
        onEdit={() => setOpenSection('whatsapp')}
      />

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Auto Approve Scans</p>
              <p className="text-xs text-muted-foreground">Scans are auto-approved without your review</p>
            </div>
          </div>
          <Switch checked={autoApprove} onCheckedChange={toggleAutoApprove} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Allow Multiple Scans</p>
              <p className="text-xs text-muted-foreground">Customers can scan multiple times a day</p>
            </div>
          </div>
          <Switch checked={allowMultiple} onCheckedChange={toggleAllowMultiple} />
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Button variant="outline" asChild>
          <a href="/admin">
            <ShieldCheck className="h-4 w-4" />
            Open Fenlark Admin
          </a>
        </Button>
      )}

      <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>

      {/* Identity dialog */}
      <Dialog open={openSection === 'identity'} onOpenChange={(o) => !o && setOpenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Business profile</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload logo
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Business name</Label>
              <Input value={form.name} onChange={update('name')} />
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
            <Button disabled={saving} onClick={() => saveSection({ name: form.name, category: form.category })}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location & hours dialog */}
      <Dialog open={openSection === 'location'} onOpenChange={(o) => !o && setOpenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Location &amp; Hours</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={update('address')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Hours</Label>
              <Input placeholder="e.g. Mon-Sun: 9am - 9pm" value={form.hours} onChange={update('hours')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Coordinates</Label>
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
                <Input placeholder="Latitude" value={form.latitude} onChange={update('latitude')} />
                <Input placeholder="Longitude" value={form.longitude} onChange={update('longitude')} />
              </div>
            </div>
            <Button
              disabled={saving}
              onClick={() =>
                saveSection({ address: form.address, hours: form.hours, latitude: form.latitude, longitude: form.longitude })
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact dialog */}
      <Dialog open={openSection === 'contact'} onOpenChange={(o) => !o && setOpenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phone &amp; Email</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={update('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={update('email')} />
            </div>
            <Button disabled={saving} onClick={() => saveSection({ phone: form.phone, email: form.email })}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social dialog */}
      <Dialog open={openSection === 'social'} onOpenChange={(o) => !o && setOpenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Social Links &amp; Reviews</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Google review link</Label>
              <Input type="url" placeholder="https://g.page/r/..." value={form.google_review_url} onChange={update('google_review_url')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Instagram handle</Label>
              <Input placeholder="@yourbusiness" value={form.instagram_handle} onChange={update('instagram_handle')} />
            </div>
            <Button
              disabled={saving}
              onClick={() => saveSection({ google_review_url: form.google_review_url, instagram_handle: form.instagram_handle })}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Business API dialog */}
      <Dialog open={openSection === 'whatsapp'} onOpenChange={(o) => !o && setOpenSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp Business API</DialogTitle>
            <DialogDescription>
              Plug in the provider you use to send WhatsApp messages. Switch providers any time -- nothing else
              changes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Provider</Label>
              <Select
                value={whatsappProvider}
                onValueChange={(v) => {
                  setWhatsappProvider(v as WhatsappProvider)
                  setWhatsappCreds({})
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WHATSAPP_PROVIDER_LABELS) as WhatsappProvider[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {WHATSAPP_PROVIDER_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {WHATSAPP_PROVIDER_FIELDS[whatsappProvider].map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label>{field.label}</Label>
                <Input
                  type={field.secret ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={whatsappCreds[field.key] ?? ''}
                  onChange={(e) => setWhatsappCreds((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-muted-foreground">Turn off to pause sending without losing these credentials</p>
              </div>
              <Switch checked={whatsappActive} onCheckedChange={setWhatsappActive} />
            </div>

            <Button disabled={savingWhatsapp} onClick={saveWhatsappConfig}>
              {savingWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SettingsRow({
  icon: Icon,
  tone,
  title,
  subtitle,
  onEdit,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  title: string
  subtitle: string
  onEdit: () => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}
