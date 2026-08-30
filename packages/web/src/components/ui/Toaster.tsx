import { useEffect, useState } from 'react'
import { Check, AlertCircle, Info } from 'lucide-react'
import { subscribeToToasts, type Toast, type ToastKind } from '../../utils/toast'
import './Toaster.css'

const TOAST_DURATION_MS = 2400

/**
 * Most toasts on screen at once.
 *
 * The stack was unbounded, and `.toaster` is `position: fixed` with no
 * max-height — so a bulk operation that downloads per item raised one toast
 * each, synchronously. Splitting a 60-page PDF produced a ~2,600px column of
 * "Downloaded ..." tiles growing from the bottom edge past the top of the
 * viewport, hiding the entire UI for the duration.
 *
 * Three is enough to show that several things happened without becoming the
 * page; older ones drop off the top as newer ones arrive.
 */
const MAX_VISIBLE_TOASTS = 3

const ICONS: Record<ToastKind, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribeToToasts(t => {
      setToasts(prev => [...prev, t].slice(-MAX_VISIBLE_TOASTS))
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
