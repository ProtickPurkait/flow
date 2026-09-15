import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-flow-gradient text-primary-foreground">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This link isn't pointing anywhere we recognize. Check the QR code or link and try again.
      </p>
      <Button asChild>
        <Link to="/">Go to home</Link>
      </Button>
    </div>
  )
}
