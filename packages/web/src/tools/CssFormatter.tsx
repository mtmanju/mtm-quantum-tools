import { Check, Copy, Download, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatCss, minifyCss, validateCss } from '../utils/css'
import './CssFormatter.css'

const CssFormatter = () => {
  const [cssContent, setCssContent] = useState('')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateCss(cssContent), [cssContent])

  const formattedCss = useMemo(() => {
    if (!cssContent.trim()) return ''
    if (!validation.isValid) return ''
    const result = formatCss(cssContent, 2)
    return result.formatted || ''
  }, [cssContent, validation.isValid])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setCssContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/css': ['.css'],
      'text/plain': ['.txt']
    }
  })

  const handleFormat = useCallback(() => {
    if (!cssContent.trim()) {
      setError('Please enter CSS content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid CSS')
      return
    }

    const result = formatCss(cssContent, 2)
    if (result.isValid && result.formatted) {
      setCssContent(result.formatted)
      setError('')
    } else {
      setError(result.error || 'Failed to format CSS')
    }
  }, [cssContent, validation])

  const handleMinify = useCallback(() => {
    if (!cssContent.trim()) {
      setError('Please enter CSS content')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid CSS')
      return
    }

    const result = minifyCss(cssContent)
    if (result.isValid && result.formatted) {
      setCssContent(result.formatted)
      setError('')
    } else {
      setError(result.error || 'Failed to minify CSS')
    }
  }, [cssContent, validation])

  const handleDownload = useCallback(() => {
    const content = formattedCss || cssContent
    if (!content.trim()) return

    const blob = new Blob([content], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'formatted.css'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [formattedCss, cssContent])

  const handleClear = useCallback(() => {
    setCssContent('')
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
      disabled: !cssContent.trim() || !validation.isValid,
      title: 'Format CSS'
    },
    {
      icon: <X size={16} />,
      label: 'Minify',
      onClick: handleMinify,
      disabled: !cssContent.trim() || !validation.isValid,
      title: 'Minify CSS'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(cssContent, (err) => setError(err)),
      disabled: !cssContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(formattedCss, (err) => setError(err)),
      disabled: !formattedCss.trim(),
      title: 'Copy output',
    },
    {
      icon: <Download size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !cssContent.trim(),
      title: 'Download CSS file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !cssContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}
      {!validation.isValid && cssContent.trim() && (
        <ErrorBar message={validation.error || 'Invalid CSS format'} />
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="CSS Input"
            onCopy={() => copyInputHook.copy(cssContent, (err) => setError(err))}
            copied={copyInputHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={cssContent}
              onChange={(e) => {
                setCssContent(e.target.value)
                setError('')
              }}
              placeholder="Paste CSS content here..."
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .css files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted CSS"
            onCopy={() => copyOutputHook.copy(formattedCss, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            {!cssContent.trim() ? (
              <div className="css-empty-state">
                <p>Enter CSS content to format</p>
              </div>
            ) : !validation.isValid ? (
              <div className="css-error-state">
                <p>Invalid CSS. Please check the input.</p>
              </div>
            ) : (
              <pre className="css-output">{formattedCss}</pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default CssFormatter

