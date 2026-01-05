import { Check, Copy, Download, FileJson, Minus, Plus, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatJson, minifyJson, validateJson } from '../utils/json'
import { downloadTextFile } from '../utils/file'
import './JsonFormatter.css'

const JsonFormatter = () => {
  const [jsonContent, setJsonContent] = useState('')
  const [indentSize, setIndentSize] = useState(2)
  const [error, setError] = useState('')
  
  const copyLeftHook = useCopy()
  const copyRightHook = useCopy()

  const validation = useMemo(() => validateJson(jsonContent), [jsonContent])

  const formattedJson = useMemo(() => {
    if (!jsonContent.trim()) return ''
    if (!validation.isValid) return ''
    return formatJson(jsonContent, indentSize)
  }, [jsonContent, indentSize, validation.isValid])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setJsonContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'application/json': ['.json'],
      'text/json': ['.json']
    }
  })

  const handleFormat = useCallback(() => {
    if (!jsonContent.trim()) {
      setError('Please enter JSON content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid JSON')
      return
    }

    setJsonContent(formattedJson)
    setError('')
  }, [jsonContent, validation, formattedJson])

  const handleMinify = useCallback(() => {
    if (!jsonContent.trim()) {
      setError('Please enter JSON content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid JSON')
      return
    }

    const minified = minifyJson(jsonContent)
    setJsonContent(minified)
    setError('')
  }, [jsonContent, validation])

  const handleDownload = useCallback(() => {
    const content = formattedJson || jsonContent
    if (!content) return

    downloadTextFile(content, 'json.json', 'application/json')
  }, [formattedJson, jsonContent])

  const handleClear = useCallback(() => {
    setJsonContent('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload JSON file'
    },
    {
      icon: <FileJson size={16} />,
      label: 'Format',
      onClick: handleFormat,
      disabled: !jsonContent.trim() || !validation.isValid,
      title: 'Format JSON',
      showDividerBefore: true
    },
    {
      icon: <Minus size={16} />,
      label: 'Compact',
      onClick: handleMinify,
      disabled: !jsonContent.trim() || !validation.isValid,
      title: 'Minify JSON'
    },
    {
      icon: <Copy size={16} />,
      label: 'Copy',
      onClick: () => copyLeftHook.copy(formattedJson || jsonContent, (err) => setError(err)),
      disabled: !jsonContent.trim(),
      title: 'Copy JSON'
    },
    {
      icon: <Download size={16} />,
      label: 'Save',
      onClick: handleDownload,
      disabled: !jsonContent.trim(),
      title: 'Download JSON'
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !jsonContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  const toolbarRight = (
    <>
      <span className="json-toolbar-label">Indent:</span>
      <div className="json-indent-control">
        <button
          type="button"
          className="json-indent-btn"
          onClick={() => setIndentSize(Math.max(0, indentSize - 1))}
          disabled={indentSize <= 0}
          aria-label="Decrease indent"
        >
          <Minus size={12} />
        </button>
        <span className="json-indent-value">{indentSize}</span>
        <button
          type="button"
          className="json-indent-btn"
          onClick={() => setIndentSize(Math.min(8, indentSize + 1))}
          disabled={indentSize >= 8}
          aria-label="Increase indent"
        >
          <Plus size={12} />
        </button>
      </div>
    </>
  )

  return (
    <ToolContainer dropzoneProps={fileUpload}>
      <Toolbar left={toolbarButtons} right={toolbarRight} />
      
      {error && <ErrorBar message={error} />}

      {validation.isValid && jsonContent.trim() && !error && (
        <div className="json-success-bar">
          <Check size={16} />
          <span>Valid JSON</span>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="JSON"
            onCopy={() => copyLeftHook.copy(jsonContent, (err) => setError(err))}
            copied={copyLeftHook.copied}
            headerActions={
              validation.error && (
                <span className="json-panel-error">{validation.error}</span>
              )
            }
          >
            <DropzoneTextarea
              {...fileUpload}
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value)
                setError('')
              }}
              placeholder="Paste your JSON here or drag and drop a file"
              spellCheck={false}
              className={!validation.isValid && jsonContent.trim() ? 'invalid' : ''}
              dropzoneText="Drag & drop JSON file or paste content"
              dropzoneHint="Supports .json files or paste directly"
              dropzoneActiveText="Drop JSON file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted"
            onCopy={() => copyRightHook.copy(formattedJson, (err) => setError(err))}
            copied={copyRightHook.copied}
          >
            <pre className="json-formatted">
              <code>{formattedJson || (jsonContent.trim() && !validation.isValid ? 'Invalid JSON' : '')}</code>
            </pre>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default JsonFormatter
