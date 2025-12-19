import { Check, Copy, Download, FileText, Minus, Plus, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatYaml, validateYaml } from '../utils/yaml'
import './YamlFormatter.css'

const YamlFormatter = () => {
  const [yamlContent, setYamlContent] = useState('')
  const [indentSize, setIndentSize] = useState(2)
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateYaml(yamlContent), [yamlContent])

  const formattedYaml = useMemo(() => {
    if (!yamlContent.trim()) return ''
    if (!validation.isValid) return ''
    return formatYaml(yamlContent, indentSize)
  }, [yamlContent, validation.isValid, indentSize])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setYamlContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/yaml': ['.yaml', '.yml'],
      'text/plain': ['.txt']
    }
  })

  const handleFormat = useCallback(() => {
    if (!yamlContent.trim()) {
      setError('Please enter YAML content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid YAML')
      return
    }

    setYamlContent(formattedYaml)
    setError('')
  }, [yamlContent, validation, formattedYaml])

  const handleDownload = useCallback(() => {
    const content = formattedYaml || yamlContent
    if (!content.trim()) return

    const blob = new Blob([content], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formatted.yaml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [formattedYaml, yamlContent])

  const handleClear = useCallback(() => {
    setYamlContent('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload YAML file'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(yamlContent, (err) => setError(err)),
      disabled: !yamlContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(formattedYaml, (err) => setError(err)),
      disabled: !formattedYaml.trim(),
      title: 'Copy output',
    },
    {
      icon: <Download size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !yamlContent.trim(),
      title: 'Download YAML file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !yamlContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  const toolbarRight = (
    <>
      <span className="yaml-toolbar-label">Indent:</span>
      <div className="yaml-indent-control">
        <button
          type="button"
          className="yaml-indent-btn"
          onClick={() => setIndentSize(Math.max(1, indentSize - 1))}
          disabled={indentSize <= 1}
          aria-label="Decrease indent"
        >
          <Minus size={12} />
        </button>
        <span className="yaml-indent-value">{indentSize}</span>
        <button
          type="button"
          className="yaml-indent-btn"
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
    <ToolContainer>
      <Toolbar left={toolbarButtons} right={toolbarRight} />

      {error && <ErrorBar message={error} />}

      {validation.isValid && yamlContent.trim() && (
        <div className="yaml-validation-bar">
          <div className="yaml-validation-success">
            <Check size={16} />
            <span>YAML syntax is valid</span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="YAML Content"
            onCopy={() => copyInputHook.copy(yamlContent, (err) => setError(err))}
            copied={copyInputHook.copied}
            headerActions={
              <button
                type="button"
                className="yaml-action-btn"
                onClick={handleFormat}
                disabled={!yamlContent.trim() || !validation.isValid}
                title="Format YAML"
              >
                Format
              </button>
            }
          >
            <DropzoneTextarea
              {...fileUpload}
              value={yamlContent}
              onChange={(e) => {
                setYamlContent(e.target.value)
                setError('')
              }}
              placeholder="Enter YAML content or paste from file..."
              spellCheck={false}
              dropzoneText="Drag & drop YAML file or paste"
              dropzoneHint="Supports .yaml, .yml files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted YAML"
            onCopy={() => copyOutputHook.copy(formattedYaml, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="yaml-results">
              {!yamlContent.trim() ? (
                <div className="yaml-empty-state">
                  <FileText size={48} />
                  <p>Enter YAML content to format</p>
                </div>
              ) : !validation.isValid ? (
                <div className="yaml-error-state">
                  <p>{validation.error || 'Invalid YAML syntax'}</p>
                </div>
              ) : (
                <pre className="yaml-formatted">{formattedYaml || yamlContent}</pre>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default YamlFormatter

