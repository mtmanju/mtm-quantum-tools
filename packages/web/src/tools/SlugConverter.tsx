import { Check, Copy, Link, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { EmptyState } from '../components/ui/EmptyState'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorPanel } from '../components/ui/EditorPanel'
import { useCopy } from '../hooks/useCopy'
import { textToSlug, slugToText } from '../utils/slug'
import { useHandoff } from '../hooks/useHandoff'
import './SlugConverter.css'

const SlugConverter = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('slug-converter', setInput)
  const [mode, setMode] = useState<'text-to-slug' | 'slug-to-text'>('text-to-slug')
  const [separator, setSeparator] = useState('-')
  /**
   * Errors raised by user *actions* (copy, upload). Conversion errors are
   * derived below and never stored — writing state during render forces an
   * extra render pass and leaves the message one render behind the value
   * that caused it.
   */
  const [actionError, setActionError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const conversion = useMemo(() => {
    if (!input.trim()) return { value: '', error: '' }

    try {
      const result = mode === 'text-to-slug' ? textToSlug(input, separator) : slugToText(input)
      if (!result.isValid) {
        return {
          value: '',
          error: result.error || (mode === 'text-to-slug' ? 'Slug generation failed' : 'Text conversion failed'),
        }
      }
      return { value: result.slug || '', error: '' }
    } catch (err) {
      return { value: '', error: err instanceof Error ? err.message : 'Conversion failed' }
    }
  }, [input, mode, separator])

  const output = conversion.value
  const error = actionError || conversion.error

  const handleClear = useCallback(() => {
    setInput('')
    setActionError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy input',
      onClick: () => copyInputHook.copy(input, (err) => setActionError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy output',
      onClick: () => copyOutputHook.copy(output, (err) => setActionError(err)),
      disabled: !output.trim(),
      title: 'Copy output',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !input.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      <div className="slug-header">
        <div className="slug-mode-selector">
          <button
            type="button"
            className={`slug-mode-btn ${mode === 'text-to-slug' ? 'active' : ''}`}
            onClick={() => {
              setMode('text-to-slug')
              setActionError('')
            }}
          >
            Text → Slug
          </button>
          <button
            type="button"
            className={`slug-mode-btn ${mode === 'slug-to-text' ? 'active' : ''}`}
            onClick={() => {
              setMode('slug-to-text')
              setActionError('')
            }}
          >
            Slug → Text
          </button>
        </div>
        {mode === 'text-to-slug' && (
          <div className="slug-separator-control">
            <label htmlFor="slug-separator">Separator:</label>
            <select
              id="slug-separator"
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              className="slug-separator-select"
            >
              <option value="-">- (Hyphen)</option>
              <option value="_">_ (Underscore)</option>
              <option value=".">.(Dot)</option>
              <option value=" "> (Space)</option>
            </select>
          </div>
        )}
      </div>

      {error && <ErrorBar message={error} />}

      <div className="slug-converter-container">
        <EditorPanel
          title={mode === 'text-to-slug' ? 'Text Input' : 'Slug Input'}
          onCopy={() => copyInputHook.copy(input, (err) => setActionError(err))}
          copied={copyInputHook.copied}
        >
          <div className="slug-input-wrapper">
            <input
              type="text"
              className="slug-input"
              placeholder={mode === 'text-to-slug' ? 'Enter text to convert to slug...' : 'Enter slug to convert to text...'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setActionError('')
              }}
            />
          </div>
        </EditorPanel>

        {!output && !error && (
          <EmptyState
            icon={<Link size={32} strokeWidth={1.5} aria-hidden="true" />}
            title="Your slug will appear here"
            hint="Type or paste a title above."
          />
        )}

        {output && (
          <EditorPanel
            title={mode === 'text-to-slug' ? 'Slug Output' : 'Text Output'}
            onCopy={() => copyOutputHook.copy(output, (err) => setActionError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="slug-output-wrapper">
              <code className="slug-output">{output}</code>
            </div>
          </EditorPanel>
        )}
      </div>
    </ToolContainer>
  )
}

export default SlugConverter

