import { memo } from 'react'
import { AlertCircle } from 'lucide-react'
import './ErrorBar.css'

interface ErrorBarProps {
  message: string
  className?: string
}

export const ErrorBar = memo(({ message, className = '' }: ErrorBarProps) => {
  if (!message) return null

  return (
    <div className={`error-bar ${className}`}>
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
  )
})

ErrorBar.displayName = 'ErrorBar'

