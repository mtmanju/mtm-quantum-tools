import { Check, Copy, Upload, X, Clock, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { timestampToDate, formatTimestampOutput, getCurrentTimestamp } from '../utils/timestamp'
import './TimestampConverter.css'

const TimestampConverter = () => {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  // Set default example on mount
  useEffect(() => {
    const current = getCurrentTimestamp()
    if (current.isValid && current.formatted) {
      setInput(current.formatted.unix.toString())
    }
  }, [])

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const conversionResult = useMemo(() => {
    if (!input.trim()) {
      return null
    }
    const result = timestampToDate(input)
    if (!result.isValid) {
      setError(result.error || 'Invalid input')
    } else {
      setError('')
    }
    return result
  }, [input])

  const output = useMemo(() => {
    if (!conversionResult || !conversionResult.isValid) {
      return ''
    }
    return formatTimestampOutput(conversionResult)
  }, [conversionResult])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text.trim())
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt']
    }
  })

  const handleUseCurrent = useCallback(() => {
    const current = getCurrentTimestamp()
    if (current.isValid && current.formatted) {
      setInput(current.formatted.unix.toString())
      setError('')
    }
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload timestamp file'
    },
    {
      icon: <RefreshCw size={16} />,
      label: 'Now',
      onClick: handleUseCurrent,
      title: 'Use current timestamp',
      showDividerBefore: true
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

      {error && <ErrorBar message={error} />}

      {conversionResult && conversionResult.isValid && conversionResult.formatted && (
        <div className="timestamp-info-bar">
          <div className="timestamp-info-item">
            <span className="timestamp-info-label">Unix (seconds):</span>
            <span className="timestamp-info-value">{conversionResult.formatted.unix}</span>
          </div>
          <div className="timestamp-info-item">
            <span className="timestamp-info-label">Unix (ms):</span>
            <span className="timestamp-info-value">{conversionResult.formatted.milliseconds}</span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="Timestamp or Date"
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
              placeholder="Enter Unix timestamp (seconds or milliseconds) or date string (e.g., 2024-01-01, Jan 1, 2024)"
              spellCheck={false}
              dropzoneText="Drag & drop timestamp file or paste"
              dropzoneHint="Supports Unix timestamps or date strings"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Converted Date & Timestamp"
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="timestamp-results">
              {!input.trim() ? (
                <div className="timestamp-empty-state">
                  <Clock size={48} />
                  <p>Enter a timestamp or date to convert</p>
                  <p className="timestamp-hint">Supports Unix timestamps (seconds or milliseconds) and date strings</p>
                </div>
              ) : !conversionResult || !conversionResult.isValid ? (
                <div className="timestamp-error-state">
                  <p>{conversionResult?.error || 'Invalid input'}</p>
                </div>
              ) : conversionResult.formatted ? (
                <div className="timestamp-formatted">
                  <div className="timestamp-formatted-section">
                    <h4 className="timestamp-section-title">ISO 8601</h4>
                    <p className="timestamp-formatted-value">{conversionResult.formatted.iso}</p>
                  </div>
                  <div className="timestamp-formatted-section">
                    <h4 className="timestamp-section-title">Local Time</h4>
                    <p className="timestamp-formatted-value">{conversionResult.formatted.local}</p>
                  </div>
                  <div className="timestamp-formatted-section">
                    <h4 className="timestamp-section-title">UTC Time</h4>
                    <p className="timestamp-formatted-value">{conversionResult.formatted.utc}</p>
                  </div>
                  <div className="timestamp-formatted-section">
                    <h4 className="timestamp-section-title">Unix Timestamp</h4>
                    <div className="timestamp-unix-values">
                      <div className="timestamp-unix-item">
                        <span className="timestamp-unix-label">Seconds:</span>
                        <span className="timestamp-unix-value">{conversionResult.formatted.unix}</span>
                      </div>
                      <div className="timestamp-unix-item">
                        <span className="timestamp-unix-label">Milliseconds:</span>
                        <span className="timestamp-unix-value">{conversionResult.formatted.milliseconds}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default TimestampConverter

