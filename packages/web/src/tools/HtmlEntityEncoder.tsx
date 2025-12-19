import { Check, Copy, Upload, X, Code, BookOpen } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { encodeHtmlEntities, decodeHtmlEntities } from '../utils/htmlEntity'
import './HtmlEntityEncoder.css'

const HtmlEntityEncoder = () => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [showReference, setShowReference] = useState(false)
  const [error, setError] = useState('')

  const commonEntities = [
    { entity: '&nbsp;', name: 'Non-breaking space', char: ' ' },
    { entity: '&lt;', name: 'Less than', char: '<' },
    { entity: '&gt;', name: 'Greater than', char: '>' },
    { entity: '&amp;', name: 'Ampersand', char: '&' },
    { entity: '&quot;', name: 'Double quote', char: '"' },
    { entity: '&#39;', name: 'Single quote', char: "'" },
    { entity: '&copy;', name: 'Copyright', char: '©' },
    { entity: '&reg;', name: 'Registered', char: '®' },
    { entity: '&trade;', name: 'Trademark', char: '™' },
    { entity: '&euro;', name: 'Euro', char: '€' },
    { entity: '&pound;', name: 'Pound', char: '£' },
    { entity: '&yen;', name: 'Yen', char: '¥' }
  ]

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt'],
      'text/html': ['.html', '.htm']
    }
  })

  const output = useMemo(() => {
    if (!input.trim()) return ''

    try {
      if (mode === 'encode') {
        const result = encodeHtmlEntities(input)
        if (!result.isValid) {
          setError(result.error || 'Encoding failed')
          return ''
        }
        setError('')
        return result.encoded || ''
      } else {
        const result = decodeHtmlEntities(input)
        if (!result.isValid) {
          setError(result.error || 'Decoding failed')
          return ''
        }
        setError('')
        return result.decoded || ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      return ''
    }
  }, [input, mode])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload file'
    },
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

      <div className="html-entity-header">
        <div className="html-entity-mode-selector">
          <button
            type="button"
            className={`html-entity-mode-btn ${mode === 'encode' ? 'active' : ''}`}
            onClick={() => {
              setMode('encode')
              setError('')
            }}
          >
            Encode
          </button>
          <button
            type="button"
            className={`html-entity-mode-btn ${mode === 'decode' ? 'active' : ''}`}
            onClick={() => {
              setMode('decode')
              setError('')
            }}
          >
            Decode
          </button>
        </div>
        <button
          type="button"
          className={`html-entity-reference-btn ${showReference ? 'active' : ''}`}
          onClick={() => setShowReference(!showReference)}
          title="Show common HTML entities reference"
        >
          <BookOpen size={16} />
          <span>Reference</span>
        </button>
      </div>

      {showReference && (
        <div className="html-entity-reference">
          <h4 className="html-entity-reference-title">Common HTML Entities</h4>
          <div className="html-entity-reference-grid">
            {commonEntities.map((item) => (
              <div key={item.entity} className="html-entity-reference-item">
                <code className="html-entity-ref-entity">{item.entity}</code>
                <span className="html-entity-ref-char">{item.char}</span>
                <span className="html-entity-ref-name">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'encode' ? 'Text to Encode' : 'HTML Entities to Decode'}
            onCopy={() => copyInputHook.copy(input, (err) => setError(err))}
            copied={copyInputHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setError('')
              }}
              placeholder={mode === 'encode' ? 'Enter text to encode as HTML entities...' : 'Enter HTML entities to decode...'}
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .txt, .html files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title={mode === 'encode' ? 'Encoded HTML Entities' : 'Decoded Text'}
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            {!input.trim() ? (
              <div className="html-entity-empty-state">
                <Code size={48} />
                <p>{mode === 'encode' ? 'Enter text to encode' : 'Enter HTML entities to decode'}</p>
              </div>
            ) : (
              <pre className="html-entity-output">{output}</pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default HtmlEntityEncoder

