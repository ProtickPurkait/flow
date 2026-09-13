import * as React from 'react'
import jsQR from 'jsqr'
import { X, Loader2, ScanLine, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QrScannerProps {
  onDetect: (slug: string) => void
  onClose: () => void
}

// Accepts either a bare slug or a full /b/:slug URL (what our printed QR
// codes actually encode -- see QrPage.tsx).
function extractSlug(raw: string): string | null {
  try {
    const url = new URL(raw)
    const match = url.pathname.match(/\/b\/([a-z0-9-]+)/i)
    if (match) return match[1]
  } catch {
    // not a URL -- fall through to treating it as a bare slug
  }
  if (/^[a-z0-9-]+$/i.test(raw.trim())) return raw.trim()
  return null
}

export function QrScanner({ onDetect, onClose }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const rafRef = React.useRef<number>(0)
  const [status, setStatus] = React.useState<'starting' | 'scanning' | 'denied' | 'unreadable'>('starting')

  React.useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('scanning')
        tick()
      } catch {
        if (!cancelled) setStatus('denied')
      }
    }

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code?.data) {
        const slug = extractSlug(code.data)
        if (slug) {
          onDetect(slug)
          return
        }
        setStatus('unreadable')
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetect identity churn shouldn't restart the camera
  }, [])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <p className="font-display text-sm font-bold text-white">Scan QR code</p>
        <button
          onClick={onClose}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {status === 'scanning' && (
          <div className="relative z-10 h-64 w-64 rounded-3xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <ScanLine className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/60" />
          </div>
        )}

        {status === 'starting' && (
          <div className="relative z-10 flex flex-col items-center gap-2 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Starting camera…</p>
          </div>
        )}

        {status === 'denied' && (
          <div className="relative z-10 mx-6 flex flex-col items-center gap-3 text-center text-white">
            <AlertCircle className="h-8 w-8" />
            <p className="font-semibold">Camera access needed</p>
            <p className="text-sm text-white/70">
              Allow camera access in your browser to scan a business's QR code.
            </p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>

      <div className="p-6 text-center">
        <p className="text-sm text-white/70">
          {status === 'unreadable'
            ? "That code isn't a Flow business QR."
            : 'Point your camera at the QR code at the counter.'}
        </p>
      </div>
    </div>
  )
}
