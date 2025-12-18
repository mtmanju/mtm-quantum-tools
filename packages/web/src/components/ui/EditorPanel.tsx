import { memo, type ReactNode } from 'react'
import { Copy, Check } from 'lucide-react'
import './EditorPanel.css'

interface EditorPanelProps {
  title: string
  children: ReactNode
  onCopy?: () => void
  copied?: boolean
  headerActions?: ReactNode
  className?: string
}

export const EditorPanel = memo(({ 
  title, 
  children, 
  onCopy, 
  copied = false,
  headerActions,
  className = '' 
}: EditorPanelProps) => {
  return (
    <div className={`editor-panel-wrapper ${className}`}>
      <div className="editor-panel-header">
        <span className="editor-panel-title">{title}</span>
        <div className="editor-panel-header-actions">
          {headerActions}
          {onCopy && (
            <button
              type="button"
              className="editor-panel-copy-btn"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onCopy()
              }}
              title="Copy"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>
      <div className="editor-panel-content">
        {children}
      </div>
    </div>
  )
})

EditorPanel.displayName = 'EditorPanel'

