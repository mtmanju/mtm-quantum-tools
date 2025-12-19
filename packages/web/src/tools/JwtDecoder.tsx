import { AlertCircle, Check, Copy, Eye, EyeOff, Shield, Upload, X, Clock } from 'lucide-react'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { decodeJwt, formatJwtTimestamp, isJwtExpired, type JwtDecodeResult } from '../utils/jwt'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { useFileUpload } from '../hooks/useFileUpload'
import './JwtDecoder.css'

const JwtDecoder = () => {
  const [token, setToken] = useState('')
  const [copiedStates, setCopiedStates] = useState({ token: false, header: false, payload: false, signature: false })
  const [showToken, setShowToken] = useState(true)
  const [error, setError] = useState('')

  const decodeResult: JwtDecodeResult = useMemo(() => {
    if (!token.trim()) {
      return { valid: false, error: 'Please enter a JWT token' }
    }
    return decodeJwt(token)
  }, [token])

  const [expirationCountdown, setExpirationCountdown] = useState<string>('')

  useEffect(() => {
    if (!decodeResult.valid || !decodeResult.payload || !isJwtExpired(decodeResult.payload)) {
      setExpirationCountdown('')
      return
    }

    const exp = (decodeResult.payload as any).exp
    if (!exp) {
      setExpirationCountdown('')
      return
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = exp - now
      
      if (remaining <= 0) {
        setExpirationCountdown('Expired')
        return
      }

      const days = Math.floor(remaining / 86400)
      const hours = Math.floor((remaining % 86400) / 3600)
      const minutes = Math.floor((remaining % 3600) / 60)
      const seconds = remaining % 60

      if (days > 0) {
        setExpirationCountdown(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setExpirationCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setExpirationCountdown(`${minutes}m ${seconds}s`)
      } else {
        setExpirationCountdown(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [decodeResult])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setToken(text.trim())
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt', '.jwt'],
      'application/json': ['.json']
    }
  })

  const handleCopy = useCallback(async (text: string, key: 'token' | 'header' | 'payload' | 'signature') => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }, [])

  const handleClear = useCallback(() => {
    setToken('')
    setError('')
    setCopiedStates({ token: false, header: false, payload: false, signature: false })
  }, [])

  const formatJson = (obj: unknown): string => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload JWT file or drag & drop'
    },
    {
      icon: copiedStates.token ? <Check size={16} /> : <Copy size={16} />,
      label: copiedStates.token ? 'Copied!' : 'Copy',
      onClick: () => handleCopy(token, 'token'),
      disabled: !token.trim(),
      title: 'Copy Token',
      showDividerBefore: true
    },
    {
      icon: showToken ? <EyeOff size={16} /> : <Eye size={16} />,
      label: showToken ? 'Hide' : 'Show',
      onClick: () => setShowToken(!showToken),
      disabled: !token.trim(),
      title: showToken ? 'Hide Token' : 'Show Token'
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !token.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer dropzoneProps={fileUpload}>
      <Toolbar left={toolbarButtons} />
      
      {error && <ErrorBar message={error} />}

      {decodeResult.error && decodeResult.error !== 'Please enter a JWT token' && (
        <ErrorBar message={decodeResult.error} />
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="JWT Token"
            onCopy={() => handleCopy(token, 'token')}
            copied={copiedStates.token}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setError('')
                setCopiedStates(prev => ({ ...prev, token: false }))
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text')
                if (pastedText) {
                  setToken(pastedText.trim())
                  setError('')
                  setCopiedStates(prev => ({ ...prev, token: false }))
                }
              }}
              placeholder={token ? '' : 'Paste JWT token here or drag & drop a file...'}
              spellCheck={false}
              className={!showToken && token ? 'jwt-editor-hidden' : ''}
              dropzoneText="Drag & drop JWT file or paste content"
              dropzoneHint="Supports .txt, .jwt, .json files or paste directly"
              dropzoneActiveText="Drop JWT file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Decoded"
            headerActions={
              decodeResult.valid && decodeResult.header && decodeResult.payload ? (
                <>
                  <button
                    type="button"
                    className="editor-panel-copy-btn"
                    onClick={() => handleCopy(formatJson(decodeResult.header), 'header')}
                    title="Copy Header"
                  >
                    {copiedStates.header ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    type="button"
                    className="editor-panel-copy-btn"
                    onClick={() => handleCopy(formatJson(decodeResult.payload), 'payload')}
                    title="Copy Payload"
                  >
                    {copiedStates.payload ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </>
              ) : undefined
            }
          >
            <div className="jwt-decoded-content">
              {!token.trim() ? (
                <div className="jwt-decoded-placeholder">
                  Decoded JWT will appear here...
                </div>
              ) : decodeResult.valid && decodeResult.header && decodeResult.payload ? (
                <div className="jwt-decoded-sections">
                  {decodeResult.valid && (
                    <div className="jwt-status-bar">
                      <Shield size={16} />
                      <span>Token decoded successfully</span>
                      {isJwtExpired(decodeResult.payload) ? (
                        <span className="jwt-expired-badge">Expired</span>
                      ) : expirationCountdown && (
                        <span className="jwt-countdown-badge">
                          <Clock size={14} />
                          <span>Expires in: {expirationCountdown}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="jwt-section">
                    <div className="jwt-section-header">
                      <h4 className="jwt-section-title">Header</h4>
                      <button
                        type="button"
                        className="jwt-section-copy-btn"
                        onClick={() => handleCopy(formatJson(decodeResult.header), 'header')}
                        title="Copy Header"
                      >
                        {copiedStates.header ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <pre className="jwt-json">
                      <code>{formatJson(decodeResult.header)}</code>
                    </pre>
                  </div>

                  <div className="jwt-section">
                    <div className="jwt-section-header">
                      <h4 className="jwt-section-title">Payload</h4>
                      <button
                        type="button"
                        className="jwt-section-copy-btn"
                        onClick={() => handleCopy(formatJson(decodeResult.payload), 'payload')}
                        title="Copy Payload"
                      >
                        {copiedStates.payload ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <pre className="jwt-json">
                      <code>{formatJson(decodeResult.payload)}</code>
                    </pre>
                    {decodeResult.payload.exp && (
                      <div className="jwt-timestamp-info">
                        <div className="jwt-timestamp-item">
                          <span className="jwt-timestamp-label">Expires:</span>
                          <span className={`jwt-timestamp-value ${isJwtExpired(decodeResult.payload) ? 'expired' : ''}`}>
                            {formatJwtTimestamp(decodeResult.payload.exp)}
                          </span>
                        </div>
                        {decodeResult.payload.iat && (
                          <div className="jwt-timestamp-item">
                            <span className="jwt-timestamp-label">Issued:</span>
                            <span className="jwt-timestamp-value">
                              {formatJwtTimestamp(decodeResult.payload.iat)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {decodeResult.signature && (
                    <div className="jwt-section">
                      <div className="jwt-section-header">
                        <h4 className="jwt-section-title">Signature</h4>
                        <button
                          type="button"
                          className="jwt-section-copy-btn"
                          onClick={() => handleCopy(decodeResult.signature || '', 'signature')}
                          title="Copy Signature"
                        >
                          {copiedStates.signature ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="jwt-signature">
                        {decodeResult.signature.substring(0, 80)}...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="jwt-decoded-error">
                  <AlertCircle size={20} />
                  <span>{decodeResult.error || 'Invalid JWT token'}</span>
                </div>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default JwtDecoder
