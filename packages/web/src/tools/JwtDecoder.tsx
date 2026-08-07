import { AlertCircle, AlertTriangle, Check, Copy, Eye, EyeOff, Shield, Upload, X, Clock } from 'lucide-react'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { useHandoff } from '../hooks/useHandoff'
import { decodeJwt, formatJwtTimestamp, isJwtExpired, type JwtDecodeResult } from '../utils/jwt'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { useFileUpload } from '../hooks/useFileUpload'
import './JwtDecoder.css'

const EXAMPLES = [
  {
    label: 'Standard claims',
    desc: 'sub, iat, exp',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  },
  {
    label: 'Expired token',
    desc: 'iat in past',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjM5MDgyfQ.YzpQE-PuS5C5xDgMSCNCXckqGn1OBqJfvHhHKjPxJl4',
  },
  {
    label: 'RS256 signed',
    desc: 'asymmetric alg',
    token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdXRoLmV4YW1wbGUuY29tIiwic3ViIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJhdWQiOiJhcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMCwicm9sZXMiOlsiYWRtaW4iXX0.SIGNATURE_PLACEHOLDER',
  },
  {
    label: 'Custom claims',
    desc: 'roles, scopes',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsIm5hbWUiOiJBbGljZSIsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJhZG1pbiIsImVkaXRvciJdLCJzY29wZXMiOlsicmVhZDp1c2VycyIsIndyaXRlOnVzZXJzIl0sImlhdCI6MTcwMDAwMDAwMH0.eF6P9YqxQ8YJjqJZJ9_Vd5Q9rRGfXh3GpVy6IfRJ5KU',
  },
]

const JwtDecoder = () => {
  const [token, setToken] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('jwt-decoder', setToken)
  const [copiedStates, setCopiedStates] = useState({ token: false, header: false, payload: false, signature: false })
  const [showToken, setShowToken] = useState(true)
  const [error, setError] = useState('')

  const decodeResult: JwtDecodeResult = useMemo(() => {
    if (!token.trim()) {
      return { valid: false, error: 'Please enter a JWT token' }
    }
    return decodeJwt(token)
  }, [token])

  /**
   * A ticking clock, not a stored countdown.
   *
   * The countdown used to be state written from inside an effect — including
   * synchronously on mount, which renders twice for every token. Ticking a
   * timestamp and deriving the label from it is the same behaviour with one
   * render per second and no state written during render or mount.
   */
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])

  const expirationCountdown = useMemo(() => {
    if (!decodeResult.valid || !decodeResult.payload) return ''
    const exp = decodeResult.payload.exp
    if (!exp || typeof exp !== 'number') return ''

    const remaining = exp - now
    if (remaining <= 0) return 'Expired'

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    const seconds = remaining % 60

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }, [decodeResult, now])

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

      <div className="jwt-examples-bar">
        <span className="jwt-examples-label">Try:</span>
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            type="button"
            className="jwt-example-chip"
            onClick={() => {
              setToken(ex.token)
              setError('')
              setCopiedStates({ token: false, header: false, payload: false, signature: false })
            }}
            title={ex.desc}
          >
            <span className="jwt-example-name">{ex.label}</span>
            <span className="jwt-example-desc">{ex.desc}</span>
          </button>
        ))}
      </div>

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
                    <>
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
                      <div className="jwt-unverified-warning">
                        <AlertTriangle size={14} />
                        <span>Signature not verified. This tool decodes only; it does not validate the signature.</span>
                      </div>
                    </>
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
