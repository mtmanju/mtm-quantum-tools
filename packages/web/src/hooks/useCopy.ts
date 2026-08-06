import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from '../utils/toast'

/**
 * Copy text to the clipboard.
 *
 * Returns a `copied` flag for inline affordances (icon swaps to a tick) *and*
 * raises a global toast, so the action is confirmed even when the button that
 * triggered it is off-screen or unlabelled. Copy is the terminal action of
 * almost every tool here; silent success made users click repeatedly.
 */
export const useCopy = (label = 'Copied to clipboard') => {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Don't setState on an unmounted component if the user navigates within the
  // 2s window.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = useCallback(async (text: string, onError?: (error: string) => void) => {
    if (!text) return false

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
      toast(label, 'success')
      return true
    } catch {
      const message = 'Failed to copy to clipboard'
      onError?.(message)
      toast(message, 'error')
      return false
    }
  }, [label])

  return { copied, copy }
}
