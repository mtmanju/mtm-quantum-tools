import { memo, type ReactNode } from 'react'
import './ToolContainer.css'

interface ToolContainerProps {
  children: ReactNode
  className?: string
  dropzoneProps?: {
    getRootProps: <T extends Record<string, unknown>>(props?: T) => T
    getInputProps: <T extends Record<string, unknown>>(props?: T) => T
  }
}

export const ToolContainer = memo(({ children, className = '', dropzoneProps }: ToolContainerProps) => {
  const containerProps = dropzoneProps?.getRootProps ? dropzoneProps.getRootProps() : {}

  return (
    <div className={`tool-container ${className}`} {...containerProps}>
      {dropzoneProps && <input {...dropzoneProps.getInputProps()} />}
      {children}
    </div>
  )
})

ToolContainer.displayName = 'ToolContainer'

