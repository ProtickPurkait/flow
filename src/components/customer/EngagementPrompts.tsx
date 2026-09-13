import { Star, Instagram } from 'lucide-react'
import { logEngagementClick } from '@/lib/customer'

interface Props {
  membershipId: string
  googleReviewUrl: string | null
  instagramHandle: string | null
}

export function EngagementPrompts({ membershipId, googleReviewUrl, instagramHandle }: Props) {
  if (!googleReviewUrl && !instagramHandle) return null

  const handleClick = (type: 'google_review' | 'instagram_follow', url: string) => {
    logEngagementClick(membershipId, type).catch(() => {})
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const instagramUrl = instagramHandle
    ? `https://instagram.com/${instagramHandle.replace(/^@/, '')}`
    : null

  return (
    <div className="flex flex-col gap-2.5">
      {googleReviewUrl && (
        <button
          onClick={() => handleClick('google_review', googleReviewUrl)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
            <Star className="h-4.5 w-4.5" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Leave a Google review</p>
            <p className="text-xs text-muted-foreground">Help others discover this place</p>
          </div>
        </button>
      )}
      {instagramUrl && (
        <button
          onClick={() => handleClick('instagram_follow', instagramUrl)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flow-gradient-soft text-secondary">
            <Instagram className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Follow on Instagram</p>
            <p className="text-xs text-muted-foreground">{instagramHandle}</p>
          </div>
        </button>
      )}
    </div>
  )
}
