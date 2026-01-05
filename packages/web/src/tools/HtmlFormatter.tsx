import { Check, Copy, Download, Upload, X, FileCode } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatHtml, minifyHtml, validateHtml } from '../utils/html'
import { downloadTextFile } from '../utils/file'
import './HtmlFormatter.css'

const HtmlFormatter = () => {
  const [htmlContent, setHtmlContent] = useState('')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateHtml(htmlContent), [htmlContent])

  const formattedHtml = useMemo(() => {
    if (!htmlContent.trim()) return ''
    if (!validation.isValid) return ''
    return formatHtml(htmlContent)
  }, [htmlContent, validation.isValid])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setHtmlContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/html': ['.html', '.htm'],
      'text/plain': ['.txt']
    }
  })

  const handleFormat = useCallback(() => {
    if (!htmlContent.trim()) {
      setError('Please enter HTML content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid HTML')
      return
    }

    setHtmlContent(formattedHtml)
    setError('')
  }, [htmlContent, validation, formattedHtml])

  const handleMinify = useCallback(() => {
    if (!htmlContent.trim()) {
      setError('Please enter HTML content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid HTML')
      return
    }

    const minified = minifyHtml(htmlContent)
    setHtmlContent(minified)
    setError('')
  }, [htmlContent, validation])

  const handleDownload = useCallback(() => {
    const content = formattedHtml || htmlContent
    if (!content.trim()) return

    downloadTextFile(content, 'formatted.html', 'text/html')
  }, [formattedHtml, htmlContent])

  const handleClear = useCallback(() => {
    setHtmlContent('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload HTML file'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(htmlContent, (err) => setError(err)),
      disabled: !htmlContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(formattedHtml, (err) => setError(err)),
      disabled: !formattedHtml.trim(),
      title: 'Copy output',
    },
    {
      icon: <Download size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !htmlContent.trim(),
      title: 'Download HTML file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !htmlContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      {validation.isValid && htmlContent.trim() && (
        <div className="html-validation-bar">
          <div className="html-validation-success">
            <Check size={16} />
            <span>HTML syntax is valid</span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="HTML Content"
            onCopy={() => copyInputHook.copy(htmlContent, (err) => setError(err))}
            copied={copyInputHook.copied}
            headerActions={
              <div className="html-actions">
                <button
                  type="button"
                  className="html-action-btn"
                  onClick={handleFormat}
                  disabled={!htmlContent.trim() || !validation.isValid}
                  title="Format HTML"
                >
                  Format
                </button>
                <button
                  type="button"
                  className="html-action-btn"
                  onClick={handleMinify}
                  disabled={!htmlContent.trim() || !validation.isValid}
                  title="Minify HTML"
                >
                  Minify
                </button>
              </div>
            }
          >
            <DropzoneTextarea
              {...fileUpload}
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value)
                setError('')
              }}
              placeholder="Enter HTML content or paste from file..."
              spellCheck={false}
              dropzoneText="Drag & drop HTML file or paste"
              dropzoneHint="Supports .html, .htm files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted HTML"
            onCopy={() => copyOutputHook.copy(formattedHtml, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="html-results">
              {!htmlContent.trim() ? (
                <div className="html-empty-state">
                  <FileCode size={48} />
                  <p>Enter HTML content to format</p>
                </div>
              ) : !validation.isValid ? (
                <div className="html-error-state">
                  <p>{validation.error || 'Invalid HTML syntax'}</p>
                </div>
              ) : (
                <pre className="html-formatted">{formattedHtml || htmlContent}</pre>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default HtmlFormatter

