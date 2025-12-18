import { memo, type ReactNode } from 'react'
import './EditorLayout.css'

interface EditorLayoutProps {
  left: ReactNode
  right: ReactNode
  className?: string
}

export const EditorLayout = memo(({ left, right, className = '' }: EditorLayoutProps) => {
  return (
    <div className={`editor-layout ${className}`}>
      <div className="editor-panel editor-panel-left">
        {left}
      </div>
      <div className="editor-panel editor-panel-right">
        {right}
      </div>
    </div>
  )
})

EditorLayout.displayName = 'EditorLayout'

