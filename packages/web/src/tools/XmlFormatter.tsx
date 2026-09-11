import { Check, Copy, CodeXml, FileCode, Upload, X } from 'lucide-react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
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
import { useHandoff } from '../hooks/useHandoff'
import './XmlFormatter.css'

const XmlFormatter = () => {
  const [xmlContent, setXmlContent] = useState('')
  /**
   * Derived output follows typing rather than blocking it.
   *
   * `input` is a discrete event, so React computes its consequences
   * synchronously before the browser can paint the character. Deferring the
   * derived work lets the keystroke commit on its own and the results catch
   * up at a lower priority. The textarea keeps the urgent value, so the
   * caret never lags or jumps.
   */
  const deferredXmlContent = useDeferredValue(xmlContent)
  /**
   * Which transform the output pane is showing.
   *
   * Minify wrote its result back into the *input* while the output pane,
   * Download and Copy-output all re-ran the formatter over that input — so
   * clicking Compact collapsed the left pane and instantly re-expanded the
   * right one, and Download saved the pretty version of the text the user
   * had just asked to minify. The minified result had no export path at all.
   */
  const [outputMode, setOutputMode] = useState<'format' | 'minify'>('format')

  // Accept a value handed over by the paste bar.
  useHandoff('xml-formatter', setXmlContent)
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateXml(xmlContent), [xmlContent])

  const formattedXml = useMemo(() => {
    if (!deferredXmlContent.trim()) return ''
    if (!validation.isValid) return ''
    const result = outputMode === 'minify' ? minifyXml(deferredXmlContent) : formatXml(deferredXmlContent, 2)
    return result.formatted || ''
  }, [deferredXmlContent, validation.isValid, outputMode])

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
      setOutputMode('format')
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
    const content = formattedXml
    if (!content.trim()) return

    downloadTextFile(content, 'formatted.xml', 'text/xml')
  }, [formattedXml])

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
      label: copyInputHook.copied ? 'Copied!' : 'Copy input',
      onClick: () => copyInputHook.copy(xmlContent, (err) => setError(err)),
      disabled: !xmlContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy output',
      onClick: () => copyOutputHook.copy(formattedXml, (err) => setError(err)),
      disabled: !formattedXml.trim(),
      title: 'Copy output',
    },
    {
      icon: <FileCode size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !xmlContent.trim() || !validation.isValid,
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

