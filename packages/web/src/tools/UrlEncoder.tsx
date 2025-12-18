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
import './UrlEncoder.css'

const UrlEncoder = () => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt']
    }
  })

  const output = useMemo(() => {
    if (!input.trim()) return ''
    
    if (mode === 'encode') {
      return encodeUrl(input)
    } else {
      const result = decodeUrl(input)
      if (!result.isValid) {
        setError(result.error || 'Invalid URL encoding')
        return ''
      }
      setError('')
      return result.decoded
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

      <div className="url-mode-selector">
        <button
          type="button"
          className={`url-mode-btn ${mode === 'encode' ? 'active' : ''}`}
          onClick={() => {
            setMode('encode')
            setError('')
          }}
        >
          Encode
        </button>
        <button
          type="button"
          className={`url-mode-btn ${mode === 'decode' ? 'active' : ''}`}
          onClick={() => {
            setMode('decode')
            setError('')
          }}
        >
          Decode
        </button>
      </div>

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'encode' ? 'Text to Encode' : 'URL to Decode'}
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
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
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

