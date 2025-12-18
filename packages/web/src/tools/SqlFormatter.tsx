import { Check, Copy, Upload, X, Database } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatSql, minifySql, validateSql } from '../utils/sql'
import './SqlFormatter.css'

const SqlFormatter = () => {
  const [sqlContent, setSqlContent] = useState('')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateSql(sqlContent), [sqlContent])

  const formattedSql = useMemo(() => {
    if (!sqlContent.trim()) return ''
    if (!validation.isValid) return ''
    return formatSql(sqlContent)
  }, [sqlContent, validation.isValid])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setSqlContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.sql', '.txt'],
      'application/sql': ['.sql']
    }
  })

  const handleFormat = useCallback(() => {
    if (!sqlContent.trim()) {
      setError('Please enter SQL query')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid SQL')
      return
    }

    setSqlContent(formattedSql)
    setError('')
  }, [sqlContent, validation, formattedSql])

  const handleMinify = useCallback(() => {
    if (!sqlContent.trim()) {
      setError('Please enter SQL query')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid SQL')
      return
    }

    const minified = minifySql(sqlContent)
    setSqlContent(minified)
    setError('')
  }, [sqlContent, validation])

  const handleClear = useCallback(() => {
    setSqlContent('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload SQL file'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyInputHook.copy(sqlContent, (err) => setError(err)),
      disabled: !sqlContent.trim(),
      title: 'Copy SQL',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !sqlContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      {validation.isValid && sqlContent.trim() && (
        <div className="sql-validation-bar">
          <div className="sql-validation-success">
            <Check size={16} />
            <span>SQL syntax is valid</span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="SQL Query"
            onCopy={() => copyInputHook.copy(sqlContent, (err) => setError(err))}
            copied={copyInputHook.copied}
            headerActions={
              <div className="sql-actions">
                <button
                  type="button"
                  className="sql-action-btn"
                  onClick={handleFormat}
                  disabled={!sqlContent.trim() || !validation.isValid}
                  title="Format SQL"
                >
                  Format
                </button>
                <button
                  type="button"
                  className="sql-action-btn"
                  onClick={handleMinify}
                  disabled={!sqlContent.trim() || !validation.isValid}
                  title="Minify SQL"
                >
                  Minify
                </button>
              </div>
            }
          >
            <DropzoneTextarea
              {...fileUpload}
              value={sqlContent}
              onChange={(e) => {
                setSqlContent(e.target.value)
                setError('')
              }}
              placeholder="Enter SQL query or paste from file..."
              spellCheck={false}
              dropzoneText="Drag & drop SQL file or paste query"
              dropzoneHint="Supports .sql files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted SQL"
            onCopy={() => copyOutputHook.copy(formattedSql, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="sql-results">
              {!sqlContent.trim() ? (
                <div className="sql-empty-state">
                  <Database size={48} />
                  <p>Enter SQL query to format</p>
                </div>
              ) : !validation.isValid ? (
                <div className="sql-error-state">
                  <p>{validation.error || 'Invalid SQL syntax'}</p>
                </div>
              ) : (
                <pre className="sql-formatted">{formattedSql || sqlContent}</pre>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default SqlFormatter

