import { Check, Copy, Download, Upload, X, CodeXml } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatXml, minifyXml, validateXml } from '../utils/xml'
import { downloadTextFile } from '../utils/file'
import './XmlFormatter.css'

const XmlFormatter = () => {
  const [xmlContent, setXmlContent] = useState('')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateXml(xmlContent), [xmlContent])

  const formattedXml = useMemo(() => {
    if (!xmlContent.trim()) return ''
    if (!validation.isValid) return ''
    const result = formatXml(xmlContent, 2)
    return result.formatted || ''
  }, [xmlContent, validation.isValid])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setXmlContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/plain': ['.txt']
    }
  })

  const handleFormat = useCallback(() => {
    if (!xmlContent.trim()) {
      setError('Please enter XML content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid XML')
      return
    }

    const result = formatXml(xmlContent, 2)
    if (result.isValid && result.formatted) {
      setXmlContent(result.formatted)
      setError('')
    } else {
      setError(result.error || 'Failed to format XML')
    }
  }, [xmlContent, validation])

  const handleMinify = useCallback(() => {
    if (!xmlContent.trim()) {
      setError('Please enter XML content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid XML')
      return
    }

    const result = minifyXml(xmlContent)
    if (result.isValid && result.formatted) {
      setXmlContent(result.formatted)
      setError('')
    } else {
      setError(result.error || 'Failed to minify XML')
    }
  }, [xmlContent, validation])

  const handleDownload = useCallback(() => {
    const content = formattedXml || xmlContent
    if (!content.trim()) return

    downloadTextFile(content, 'formatted.xml', 'text/xml')
  }, [formattedXml, xmlContent])

  const handleClear = useCallback(() => {
    setXmlContent('')
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
      icon: <Check size={16} />,
      label: 'Format',
      onClick: handleFormat,
      disabled: !xmlContent.trim() || !validation.isValid,
      title: 'Format XML'
    },
    {
      icon: <X size={16} />,
      label: 'Minify',
      onClick: handleMinify,
      disabled: !xmlContent.trim() || !validation.isValid,
      title: 'Minify XML'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(xmlContent, (err) => setError(err)),
      disabled: !xmlContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(formattedXml, (err) => setError(err)),
      disabled: !formattedXml.trim(),
      title: 'Copy output',
    },
    {
      icon: <Download size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !xmlContent.trim(),
      title: 'Download XML file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !xmlContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}
      {!validation.isValid && xmlContent.trim() && (
        <ErrorBar message={validation.error || 'Invalid XML format'} />
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="XML Input"
            onCopy={() => copyInputHook.copy(xmlContent, (err) => setError(err))}
            copied={copyInputHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={xmlContent}
              onChange={(e) => {
                setXmlContent(e.target.value)
                setError('')
              }}
              placeholder="Paste XML content here..."
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .xml files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted XML"
            onCopy={() => copyOutputHook.copy(formattedXml, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            {!xmlContent.trim() ? (
              <div className="xml-empty-state">
                <CodeXml size={48} />
                <p>Enter XML content to format</p>
              </div>
            ) : !validation.isValid ? (
              <div className="xml-error-state">
                <p>Invalid XML. Please check the input.</p>
              </div>
            ) : (
              <pre className="xml-output">{formattedXml}</pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default XmlFormatter

