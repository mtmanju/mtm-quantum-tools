import { memo, type ReactNode, Fragment as ReactFragment } from 'react'
import './Toolbar.css'

interface ToolbarButton {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  showDividerBefore?: boolean
}

interface ToolbarProps {
  left?: ToolbarButton[]
  right?: ReactNode
  className?: string
}

export const Toolbar = memo(({ left, right, className = '' }: ToolbarProps) => {
  if (!left && !right) return null

  return (
    <div className={`toolbar ${className}`}>
      {left && (
        <div className="toolbar-left">
          {left.map((btn, index) => (
            <ReactFragment key={index}>
              {/* `index > 0`: a divider before the first button draws a rule
                  with nothing on its left, which several tools were doing
                  (Color Converter opened with a stray leading hairline). */}
              {btn.showDividerBefore && index > 0 && <div className="toolbar-divider" />}
              <button
                type="button"
                className="toolbar-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  btn.onClick()
                }}
                disabled={btn.disabled}
                title={btn.title}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            </ReactFragment>
          ))}
        </div>
      )}
      {right && <div className="toolbar-right">{right}</div>}
    </div>
  )
})

Toolbar.displayName = 'Toolbar'

