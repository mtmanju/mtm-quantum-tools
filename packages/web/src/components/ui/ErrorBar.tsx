import { memo } from 'react'
import { AlertCircle } from 'lucide-react'
import './ErrorBar.css'

interface ErrorBarProps {
  message: string
  /** Set when a form control references this error via aria-describedby. */
  id?: string
  className?: string
}

export const ErrorBar = memo(({ message, id, className = '' }: ErrorBarProps) => {
  if (!message) return null

  return (
    // role="alert" carries an implicit aria-live="assertive", so the message is
    // announced the moment it appears. Without it the error is visible only to
    // sighted users — which was the case across all 44 tools that use this.
    <div id={id} role="alert" className={`error-bar ${className}`}>
      <AlertCircle size={16} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
})

ErrorBar.displayName = 'ErrorBar'

