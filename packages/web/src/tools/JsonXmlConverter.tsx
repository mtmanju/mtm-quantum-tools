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
import './JsonXmlConverter.css'

const JsonXmlConverter = () => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'json-to-xml' | 'xml-to-json'>('json-to-xml')
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
      'application/json': ['.json'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/plain': ['.txt']
    }
  })

  const output = useMemo(() => {
    if (!input.trim()) return ''

    try {
      if (mode === 'json-to-xml') {
        const result = jsonToXml(input)
        if (!result.isValid) {
          setError(result.error || 'Conversion failed')
          return ''
        }
        setError('')
        return result.converted || ''
      } else {
        const result = xmlToJson(input)
        if (!result.isValid) {
          setError(result.error || 'Conversion failed')
          return ''
        }
        setError('')
        return result.converted || ''
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

      <div className="json-xml-mode-selector">
        <button
          type="button"
          className={`json-xml-mode-btn ${mode === 'json-to-xml' ? 'active' : ''}`}
          onClick={() => {
            setMode('json-to-xml')
            setError('')
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
            setError('')
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
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
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

