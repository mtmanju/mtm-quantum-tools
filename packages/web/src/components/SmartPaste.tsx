import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, CornerDownLeft, Sparkles, X } from 'lucide-react'
import { detect, type Detection } from '../utils/detect'
import { useCopy } from '../hooks/useCopy'
import './SmartPaste.css'

interface SmartPasteProps {
  onOpenTool: (toolId: string, value: string) => void
}

/**
 * One-click samples. Nobody has a JWT on their clipboard when they first
 * land, and an empty box that claims to understand "anything" is a promise
 * with no proof — these let the visitor see the detection work in one click.
 */
const SAMPLES: Array<{ label: string; value: string }> = [
  { label: 'JWT', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MDAwMDAwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' },
  { label: 'JSON', value: '{"user":{"id":42,"name":"Alice","roles":["admin","dev"]},"active":true}' },
  { label: 'Base64', value: 'SGVsbG8sIFdvcmxkIQ==' },
  { label: 'Timestamp', value: '1700000000' },
  { label: 'URL', value: 'https://api.example.com/v1/users?page=2&limit=50#results' },
  { label: 'Cron', value: '0 9 * * 1-5' },
]

/**
 * Paste anything; we work out what it is and offer the operations that apply.
 *
 * The alternative — pick one of 45 tools from a grid, navigate to it, paste,
 * copy, navigate back — makes the user do the classification work. Most of the
 * time they already know what they have and just want the answer, so this
 * collapses "choose a tool" and "run it" into a single step, with the full
 * tool one click away when they need more than the answer.
 */
export function SmartPaste({ onOpenTool }: SmartPasteProps) {
  const [value, setValue] = useState('')
  const [activeKind, setActiveKind] = useState<string | null>(null)
  const [result, setResult] = useState<{ actionLabel: string; output: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { copied, copy } = useCopy('Result copied')

  const detections = useMemo(() => detect(value), [value])

  // The user's pick, else the most confident match.
  const active: Detection | undefined = useMemo(
    () => detections.find(d => d.kind === activeKind) ?? detections[0],
    [detections, activeKind]
  )

  const reset = useCallback(() => {
    setValue('')
    setActiveKind(null)
    setResult(null)
    textareaRef.current?.focus()
  }, [])

  const runAction = useCallback(
    (detection: Detection, actionId: string) => {
      const action = detection.actions.find(a => a.id === actionId)
      if (!action) return
      if (action.run) {
        const output = action.run(value)
        if (output !== null) {
          setResult({ actionLabel: action.label, output })
          return
        }
      }
      if (action.toolId) onOpenTool(action.toolId, value)
    },
    [value, onOpenTool]
  )

  const handleChange = (next: string) => {
    setValue(next)
    setActiveKind(null)
    setResult(null)
  }

  // Enter runs the first action of the active detection; Shift+Enter newlines.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && active?.actions[0]) {
      e.preventDefault()
      runAction(active, active.actions[0].id)
    } else if (e.key === 'Escape' && value) {
      e.preventDefault()
      reset()
    }
  }

  const others = detections.filter(d => d !== active)

  return (
    <section className="smartpaste" aria-label="Paste anything">
      <div className={`smartpaste-box ${value ? 'has-value' : ''}`}>
        <Sparkles size={16} className="smartpaste-icon" aria-hidden="true" />
        <textarea
          ref={textareaRef}
          className="smartpaste-input"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a JWT, JSON, Base64, a timestamp, or a URL"
          rows={value ? 3 : 1}
          spellCheck={false}
          aria-label="Paste content to identify"
        />
        {value && (
          <button type="button" className="smartpaste-clear" onClick={reset} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {!value && (
        <div className="smartpaste-samples">
          <span className="smartpaste-samples-label">Try</span>
          {SAMPLES.map(sample => (
            <button
              key={sample.label}
              type="button"
              className="smartpaste-sample"
              onClick={() => { handleChange(sample.value); textareaRef.current?.focus() }}
            >
              {sample.label}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="smartpaste-result" role="status" aria-live="polite">
          <div className="smartpaste-detected">
            <span className="smartpaste-badge">{active.label}</span>
            <span className="smartpaste-summary">{active.summary}</span>

            <div className="smartpaste-actions">
              {active.actions.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className="smartpaste-action"
                  onClick={() => runAction(active, a.id)}
                >
                  {a.label}
                  {!a.run && <ArrowRight size={12} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          {others.length > 0 && (
            <div className="smartpaste-alternatives">
              <span>Also reads as</span>
              {others.map(d => (
                <button
                  key={d.kind}
                  type="button"
                  className="smartpaste-alt"
                  onClick={() => { setActiveKind(d.kind); setResult(null) }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {result && (
            <div className="smartpaste-output">
              <div className="smartpaste-output-header">
                <span>{result.actionLabel}</span>
                <div className="smartpaste-output-actions">
                  <button
                    type="button"
                    onClick={() => copy(result.output)}
                    title="Copy result"
                    aria-label="Copy result"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  {active.actions[0]?.toolId && (
                    <button
                      type="button"
                      onClick={() => onOpenTool(active.actions[0].toolId!, value)}
                      title="Open the full tool"
                    >
                      Open tool <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
              <pre className="smartpaste-output-body">{result.output}</pre>
            </div>
          )}

          {!result && active.actions.some(a => a.run) && (
            <p className="smartpaste-hint">
              <kbd><CornerDownLeft size={10} /></kbd> to {active.actions[0].label.toLowerCase()}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
