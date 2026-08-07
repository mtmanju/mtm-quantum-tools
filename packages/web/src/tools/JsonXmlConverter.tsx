import { Check, Copy, Upload, X, ArrowRightLeft } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { jsonToXml, xmlToJson } from '../utils/jsonXml'
import { useHandoff } from '../hooks/useHandoff'
import './JsonXmlConverter.css'

const JsonXmlConverter = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('json-xml-converter', setInput)
  const [mode, setMode] = useState<'json-to-xml' | 'xml-to-json'>('json-to-xml')
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
      'application/json': ['.json'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/plain': ['.txt']
    }
  })

  const conversion = useMemo(() => {
    if (!input.trim()) return { value: '', error: '' }

    try {
      if (mode === 'json-to-xml') {
        const result = jsonToXml(input)
        if (!result.isValid) {
          return { value: '', error: result.error || 'Conversion failed' }
        }
        return { value: result.converted || '', error: '' }
      } else {
        const result = xmlToJson(input)
        if (!result.isValid) {
          return { value: '', error: result.error || 'Conversion failed' }
        }
        return { value: result.converted || '', error: '' }
      }
    } catch (err) {
      return { value: '', error: err instanceof Error ? err.message : 'Conversion failed' }
    }
  }, [input, mode])

  const output = conversion.value
  const error = actionError || conversion.error

  const handleClear = useCallback(() => {
    setInput('')
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

      <div className="json-xml-mode-selector">
        <button
          type="button"
          className={`json-xml-mode-btn ${mode === 'json-to-xml' ? 'active' : ''}`}
          onClick={() => {
            setMode('json-to-xml')
            setActionError('')
          }}
        >
          <ArrowRightLeft size={16} />
          <span>JSON → XML</span>
        </button>
        <button
          type="button"
          className={`json-xml-mode-btn ${mode === 'xml-to-json' ? 'active' : ''}`}
          onClick={() => {
            setMode('xml-to-json')
            setActionError('')
          }}
        >
          <ArrowRightLeft size={16} />
          <span>XML → JSON</span>
        </button>
      </div>

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'json-to-xml' ? 'JSON Input' : 'XML Input'}
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
              placeholder={mode === 'json-to-xml' ? 'Paste JSON here...' : 'Paste XML here...'}
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint={mode === 'json-to-xml' ? 'Supports .json files' : 'Supports .xml files'}
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title={mode === 'json-to-xml' ? 'XML Output' : 'JSON Output'}
            onCopy={() => copyOutputHook.copy(output, (err) => setActionError(err))}
            copied={copyOutputHook.copied}
          >
            {!input.trim() ? (
              <div className="json-xml-empty-state">
                <ArrowRightLeft size={48} />
                <p>{mode === 'json-to-xml' ? 'Enter JSON to convert to XML' : 'Enter XML to convert to JSON'}</p>
              </div>
            ) : (
              <pre className="json-xml-output">{output}</pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default JsonXmlConverter

