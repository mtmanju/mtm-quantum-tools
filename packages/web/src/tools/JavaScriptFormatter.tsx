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
import { formatJavaScript, minifyJavaScript } from '../utils/javascript'
import { downloadTextFile } from '../utils/file'
import './JavaScriptFormatter.css'

const JavaScriptFormatter = () => {
  const [jsContent, setJsContent] = useState('')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const formattedJs = useMemo(() => {
    if (!jsContent.trim()) return ''
    const result = formatJavaScript(jsContent, 2)
    return result.formatted || ''
  }, [jsContent])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setJsContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/javascript': ['.js'],
      'application/javascript': ['.js'],
      'text/plain': ['.txt']
    }
  })

  const handleFormat = useCallback(() => {
    if (!jsContent.trim()) {
      setError('Please enter JavaScript content')
      return
    }

    const result = formatJavaScript(jsContent, 2)
    if (result.isValid && result.formatted) {
      setJsContent(result.formatted)
      setError('')
    } else {
      setError(result.error || 'Failed to format JavaScript')
    }
  }, [jsContent])

  const handleMinify = useCallback(() => {
    if (!jsContent.trim()) {
      setError('Please enter JavaScript content')
      return
    }

    const result = minifyJavaScript(jsContent)
    if (result.isValid && result.formatted) {
      setJsContent(result.formatted)
      setError('')
    } else {
      setError(result.error || 'Failed to minify JavaScript')
    }
  }, [jsContent])

  const handleDownload = useCallback(() => {
    const content = formattedJs || jsContent
    if (!content.trim()) return

    downloadTextFile(content, 'formatted.js', 'text/javascript')
  }, [formattedJs, jsContent])

  const handleClear = useCallback(() => {
    setJsContent('')
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
      disabled: !jsContent.trim(),
      title: 'Format JavaScript'
    },
    {
      icon: <X size={16} />,
      label: 'Minify',
      onClick: handleMinify,
      disabled: !jsContent.trim(),
      title: 'Minify JavaScript'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(jsContent, (err) => setError(err)),
      disabled: !jsContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(formattedJs, (err) => setError(err)),
      disabled: !formattedJs.trim(),
      title: 'Copy output',
    },
    {
      icon: <Download size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !jsContent.trim(),
      title: 'Download JavaScript file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !jsContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title="JavaScript Input"
            onCopy={() => copyInputHook.copy(jsContent, (err) => setError(err))}
            copied={copyInputHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={jsContent}
              onChange={(e) => {
                setJsContent(e.target.value)
                setError('')
              }}
              placeholder="Paste JavaScript code here..."
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .js files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted JavaScript"
            onCopy={() => copyOutputHook.copy(formattedJs, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            {!jsContent.trim() ? (
              <div className="js-empty-state">
                <p>Enter JavaScript code to format</p>
              </div>
            ) : (
              <pre className="js-output">{formattedJs}</pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default JavaScriptFormatter

