import * as React from 'react'

export type ToastVariant = 'default' | 'success' | 'destructive'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: (t: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { ...t, id }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  return <ToastContext.Provider value={{ toasts, toast, dismiss }}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
