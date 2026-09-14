import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Phone, Mail, Cake, Moon, LogOut, Pencil, Check, User as UserIcon, ShieldCheck, LifeBuoy, ChevronRight } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { getMyProfile, updateMyProfile, signOutCustomer } from '@/lib/customer'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useToast } from '@/hooks/use-toast'
import { PhoneCapturePrompt } from '@/components/customer/PhoneCapturePrompt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { CustomerProfile } from '@/types/database'

export default function ProfilePage() {
  const { loading, registered, refresh } = useCustomerAccount()
  const { isDark, toggle } = useDarkMode()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [profile, setProfile] = React.useState<CustomerProfile | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [dateOfBirth, setDateOfBirth] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!registered) return
    getMyProfile().then((p) => {
      if (!p) return
      setProfile(p)
      setName(p.name ?? '')
      setEmail(p.email ?? '')
      setDateOfBirth(p.date_of_birth ?? '')
    })
  }, [registered])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateMyProfile(name, email, dateOfBirth)
      if (updated) setProfile(updated)
      setEditing(false)
      toast({ title: 'Profile updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not save', description: err instanceof Error ? err.message : undefined, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOutCustomer()
    navigate('/', { replace: true })
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!registered) {
    return <PhoneCapturePrompt onRegistered={refresh} title="Sign in to view your profile" />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-flow-gradient px-6 pb-10 pt-8 text-center text-white">
        <h1 className="font-display text-2xl font-bold">My Profile</h1>
        <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
          <UserIcon className="h-9 w-9" />
        </div>

        {editing ? (
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="border-white/30 bg-white/10 text-center text-white placeholder:text-white/50"
            />
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <p className="font-display text-lg font-bold">{profile?.name || 'Add your name'}</p>
            <button onClick={() => setEditing(true)} className="cursor-pointer text-white/70" aria-label="Edit name">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {editing && (
          <Button size="sm" variant="secondary" className="mt-3" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </Button>
        )}
      </div>

      <div className="mx-auto -mt-4 max-w-md px-4">
        <div className="rounded-2xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone number</p>
              <p className="font-semibold">{profile?.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email address</p>
              {editing ? (
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-1 h-9"
                />
              ) : (
                <p className={profile?.email ? 'font-semibold' : 'italic text-muted-foreground'}>
                  {profile?.email || 'Not set'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Cake className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Birthday</p>
              {editing ? (
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1 h-9" />
              ) : (
                <p className={profile?.date_of_birth ? 'font-semibold' : 'italic text-muted-foreground'}>
                  {profile?.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
                    : 'Add it for birthday treats from businesses you visit'}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">App settings</p>
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Moon className="h-4 w-4" />
              </div>
              <p className="font-semibold">Dark mode</p>
            </div>
            <Switch checked={isDark} onCheckedChange={toggle} />
          </div>
        </div>

        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">Support</p>
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <Link
            to="/profile/privacy-security"
            className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="font-semibold">Privacy and Security</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            to="/profile/help-support"
            className="flex items-center justify-between gap-3 border-t border-border p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <p className="font-semibold">Help and Support</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>

        <Button variant="outline" className="mt-6 w-full border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
