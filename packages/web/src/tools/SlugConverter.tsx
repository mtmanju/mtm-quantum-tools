import { Check, Copy, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorPanel } from '../components/ui/EditorPanel'
import { useCopy } from '../hooks/useCopy'
import { textToSlug, slugToText } from '../utils/slug'
import './SlugConverter.css'

const SlugConverter = () => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'text-to-slug' | 'slug-to-text'>('text-to-slug')
  const [separator, setSeparator] = useState('-')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const output = useMemo(() => {
    if (!input.trim()) return ''

    try {
      if (mode === 'text-to-slug') {
        const result = textToSlug(input, separator)
        if (!result.isValid) {
          setError(result.error || 'Slug generation failed')
          return ''
        }
        setError('')
        return result.slug || ''
      } else {
        const result = slugToText(input)
        if (!result.isValid) {
          setError(result.error || 'Text conversion failed')
          return ''
        }
        setError('')
        return result.slug || ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      return ''
    }
  }, [input, mode, separator])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(input, (err) => setError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(output, (err) => setError(err)),
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
              setError('')
            }}
          >
            Text → Slug
          </button>
          <button
            type="button"
            className={`slug-mode-btn ${mode === 'slug-to-text' ? 'active' : ''}`}
            onClick={() => {
              setMode('slug-to-text')
              setError('')
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
          onCopy={() => copyInputHook.copy(input, (err) => setError(err))}
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
                setError('')
              }}
            />
          </div>
        </EditorPanel>

        {output && (
          <EditorPanel
            title={mode === 'text-to-slug' ? 'Slug Output' : 'Text Output'}
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
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

