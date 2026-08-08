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
      {/* react-dropzone's hidden file input. Out of the tab order (tabIndex
          -1) but still in the accessibility tree, so it needs a name — see
          the same note in DropzoneTextarea. */}
      {dropzoneProps && <input aria-label="Upload a file" {...dropzoneProps.getInputProps()} />}
      {children}
    </div>
  )
})

ToolContainer.displayName = 'ToolContainer'

