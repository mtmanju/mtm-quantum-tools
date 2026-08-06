import { Check, Copy, Upload, X, Link } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { encodeUrl, decodeUrl } from '../utils/url'
import { useHandoff } from '../hooks/useHandoff'
import './UrlEncoder.css'

const ENCODE_EXAMPLES = [
  { label: 'Query string', text: 'name=Alice & Bob&city=New York' },
  { label: 'Special chars', text: 'hello world! @#$%^&*()' },
  { label: 'URL params', text: 'https://example.com/search?q=café&category=food' },
  { label: 'Unicode', text: '日本語 テスト 🚀' },
]

const DECODE_EXAMPLES = [
  { label: 'Query string', text: 'name%3DAlice%20%26%20Bob%26city%3DNew%20York' },
  { label: 'Special chars', text: 'hello%20world!%20%40%23%24%25%5E%26*()' },
  { label: 'URL params', text: 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dcaf%C3%A9' },
  { label: 'Unicode', text: '%E6%97%A5%E6%9C%AC%E8%AA%9E' },
]

const UrlEncoder = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('url-encoder', setInput)
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [encodeMode, setEncodeMode] = useState<'component' | 'full'>('component')
  /**
   * Errors raised by user *actions* (copy, upload). Conversion errors are
   * derived below and never stored — writing state during render forces an
   * extra render pass and leaves the message one render behind the value
   * that caused it.
   */
  const [actionError, setActionError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text)
      setActionError('')
    },
    onError: (err) => setActionError(err),
    accept: {
      'text/plain': ['.txt']
    }
  })

  const conversion = useMemo(() => {
    if (!input.trim()) return { value: '', error: '' }

    if (mode === 'encode') {
      return { value: encodeUrl(input, encodeMode === 'component'), error: '' }
    } else {
      const result = decodeUrl(input)
      if (!result.isValid) {
        return { value: '', error: result.error || 'Invalid URL encoding' }
      }
      return { value: result.decoded, error: '' }
    }
  }, [input, mode, encodeMode])

  const output = conversion.value
  const error = actionError || conversion.error

  const handleClear = useCallback(() => {
    setInput('')
    setActionError('')
  }, [])

  const handleLoadExample = useCallback((text: string) => {
    setInput(text)
    setActionError('')
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
      onClick: () => copyInputHook.copy(input, (err) => setActionError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
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

      <div className="url-examples-bar">
        <span className="url-examples-label">Try it</span>
        {(mode === 'encode' ? ENCODE_EXAMPLES : DECODE_EXAMPLES).map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="url-example-chip"
            onClick={() => handleLoadExample(ex.text)}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="url-mode-selector">
        <div className="url-mode-group">
          <button
            type="button"
            className={`url-mode-btn ${mode === 'encode' ? 'active' : ''}`}
            onClick={() => {
              setMode('encode')
              setActionError('')
            }}
          >
            Encode
          </button>
          <button
            type="button"
            className={`url-mode-btn ${mode === 'decode' ? 'active' : ''}`}
            onClick={() => {
              setMode('decode')
              setActionError('')
            }}
          >
            Decode
          </button>
        </div>
        {mode === 'encode' && (
          <div className="url-encode-mode-group">
            <label className="url-encode-mode-label">
              <input
                type="radio"
                name="encodeMode"
                value="component"
                checked={encodeMode === 'component'}
                onChange={() => setEncodeMode('component')}
              />
              <span>Component (encodeURIComponent)</span>
            </label>
            <label className="url-encode-mode-label">
              <input
                type="radio"
                name="encodeMode"
                value="full"
                checked={encodeMode === 'full'}
                onChange={() => setEncodeMode('full')}
              />
              <span>Full URL (encodeURI)</span>
            </label>
          </div>
        )}
      </div>

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'encode' ? 'Text to Encode' : 'URL to Decode'}
            onCopy={() => copyInputHook.copy(input, (err) => setActionError(err))}
            copied={copyInputHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setActionError('')
              }}
              placeholder={mode === 'encode' ? 'Enter text to URL encode...' : 'Enter URL-encoded text to decode...'}
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .txt files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title={mode === 'encode' ? 'Encoded URL' : 'Decoded Text'}
            onCopy={() => copyOutputHook.copy(output, (err) => setActionError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="url-output">
              {!input.trim() ? (
                <div className="url-empty-state">
                  <Link size={48} />
                  <p>{mode === 'encode' ? 'Enter text to encode' : 'Enter URL-encoded text to decode'}</p>
                </div>
              ) : (
                <pre className="url-result">{output}</pre>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default UrlEncoder

