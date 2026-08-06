import { useEffect, useState } from 'react'
import { Check, AlertCircle, Info } from 'lucide-react'
import { subscribeToToasts, type Toast, type ToastKind } from '../../utils/toast'
import './Toaster.css'

const TOAST_DURATION_MS = 2400

const ICONS: Record<ToastKind, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribeToToasts(t => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), TOAST_DURATION_MS)
    })
  }, [])

  return (
    // aria-live so the confirmation is announced, not just seen. Polite rather
    // than assertive: "Copied" should never interrupt what's being read.
    <div className="toaster" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map(t => {
        const Icon = ICONS[t.kind]
        return (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon size={14} aria-hidden="true" />
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
