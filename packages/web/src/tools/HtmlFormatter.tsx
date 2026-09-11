import { Check, Copy, FileCode, Upload, X } from 'lucide-react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
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
import { useHandoff } from '../hooks/useHandoff'
import './HtmlFormatter.css'

const HtmlFormatter = () => {
  const [htmlContent, setHtmlContent] = useState('')
  /**
   * Derived output follows typing rather than blocking it.
   *
   * `input` is a discrete event, so React computes its consequences
   * synchronously before the browser can paint the character. Deferring the
   * derived work lets the keystroke commit on its own and the results catch
   * up at a lower priority. The textarea keeps the urgent value, so the
   * caret never lags or jumps.
   */
  const deferredHtmlContent = useDeferredValue(htmlContent)
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
  useHandoff('html-formatter', setHtmlContent)
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateHtml(htmlContent), [htmlContent])

  const formattedHtml = useMemo(() => {
    if (!deferredHtmlContent.trim()) return ''
    if (!validation.isValid) return ''
    return outputMode === 'minify'
      ? minifyHtml(deferredHtmlContent)
      : formatHtml(deferredHtmlContent)
  }, [deferredHtmlContent, validation.isValid, outputMode])

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
    setOutputMode('minify')
    setError('')
  }, [htmlContent, validation])

  const handleDownload = useCallback(() => {
    const content = formattedHtml
    if (!content.trim()) return

    downloadTextFile(content, 'formatted.html', 'text/html')
  }, [formattedHtml])

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
      label: copyInputHook.copied ? 'Copied!' : 'Copy input',
      onClick: () => copyInputHook.copy(htmlContent, (err) => setError(err)),
      disabled: !htmlContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy output',
      onClick: () => copyOutputHook.copy(formattedHtml, (err) => setError(err)),
      disabled: !formattedHtml.trim(),
      title: 'Copy output',
    },
    {
      icon: <FileCode size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !htmlContent.trim() || !validation.isValid,
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

