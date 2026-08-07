import { Check, Copy, Key, Plus, RefreshCw, X, Zap } from 'lucide-react'
import { useCallback, useState } from 'react'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import './JwtGenerator.css'

const JWT_HEADER = { alg: 'HS256', typ: 'JWT' }

const DEFAULT_PAYLOAD = JSON.stringify(
  {
    sub: '1234567890',
    name: 'John Doe',
    iat: 1516239022,
  },
  null,
  2
)

async function signJwt(header: object, payload: object, secret: string): Promise<string> {
  const encoder = new TextEncoder()

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const payloadB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const signingInput = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${signingInput}.${sigB64}`
}

function decodeJwtParts(token: string): { header: string; payload: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decode = (b64: string) => {
      const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(
        b64.length + ((4 - (b64.length % 4)) % 4),
        '='
      )
      return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(padded)))), null, 2)
    }
    return { header: decode(parts[0]), payload: decode(parts[1]) }
  } catch {
    return null
  }
}

const JwtGenerator = () => {
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD)
  const [secret, setSecret] = useState('your-secret-key')
  const [generatedToken, setGeneratedToken] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const copyTokenHook = useCopy()

  const handleGenerate = useCallback(async () => {
    setError('')
    setIsGenerating(true)
    try {
      let payload: object
      try {
        payload = JSON.parse(payloadText)
      } catch {
        throw new Error('Invalid JSON payload')
      }
      if (!secret.trim()) throw new Error('Secret key is required')
      const token = await signJwt(JWT_HEADER, payload, secret)
      setGeneratedToken(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token')
      setGeneratedToken('')
    } finally {
      setIsGenerating(false)
    }
  }, [payloadText, secret])

  const handleClear = useCallback(() => {
    setPayloadText(DEFAULT_PAYLOAD)
    setSecret('your-secret-key')
    setGeneratedToken('')
    setError('')
  }, [])

  const addClaim = useCallback((claim: Record<string, unknown>) => {
    setError('')
    try {
      const current = JSON.parse(payloadText)
      const updated = { ...current, ...claim }
      setPayloadText(JSON.stringify(updated, null, 2))
    } catch {
      setError('Cannot add claim: payload is not valid JSON')
    }
  }, [payloadText])

  const addIat = useCallback(() => {
    addClaim({ iat: Math.floor(Date.now() / 1000) })
  }, [addClaim])

  const addExp = useCallback((offsetSeconds: number) => {
    addClaim({ exp: Math.floor(Date.now() / 1000) + offsetSeconds })
  }, [addClaim])

  const addJti = useCallback(() => {
    addClaim({ jti: crypto.randomUUID() })
  }, [addClaim])

  const decoded = generatedToken ? decodeJwtParts(generatedToken) : null

  const toolbarButtons = [
    {
      icon: copyTokenHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyTokenHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyTokenHook.copy(generatedToken, (err) => setError(err)),
      disabled: !generatedToken,
      title: 'Copy generated token',
      showDividerBefore: true,
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      title: 'Clear',
      showDividerBefore: true,
    },
  ]

  return (
    <ToolContainer>
      <Toolbar
        left={toolbarButtons}
        right={
          <button
            type="button"
            className="jwt-gen-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            title="Sign JWT"
          >
            <Zap size={16} />
            <span>{isGenerating ? 'Generating…' : 'Generate'}</span>
          </button>
        }
      />

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel title="Payload">
            <div className="jwt-gen-left-content">
              <div className="jwt-gen-header-section">
                <div className="jwt-gen-section-label">
                  <Key size={14} />
                  <span>Header (fixed)</span>
                </div>
                <pre className="jwt-gen-header-display">
                  <code>{JSON.stringify(JWT_HEADER, null, 2)}</code>
                </pre>
              </div>

              <div className="jwt-gen-payload-section">
                <div className="jwt-gen-section-label">
                  <span>Payload JSON</span>
                </div>
                <textarea
                  className="jwt-gen-payload-textarea"
                  value={payloadText}
                  onChange={(e) => {
                    setPayloadText(e.target.value)
                    setError('')
                  }}
                  spellCheck={false}
                  placeholder="Enter JWT payload as JSON..."
                />
              </div>

              <div className="jwt-gen-secret-section">
                <div className="jwt-gen-section-label">
                  <span>HMAC Secret</span>
                </div>
                <input
                  type="text"
                  className="jwt-gen-secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret key..."
                  spellCheck={false}
                />
              </div>

              <div className="jwt-gen-quick-claims">
                <span className="jwt-gen-quick-label">
                  <Plus size={13} />
                  Quick claims:
                </span>
                <button
                  type="button"
                  className="jwt-gen-claim-btn"
                  onClick={addIat}
                  title="Add iat = now"
                >
                  iat (now)
                </button>
                <button
                  type="button"
                  className="jwt-gen-claim-btn"
                  onClick={() => addExp(3600)}
                  title="Add exp = now + 1 hour"
                >
                  exp +1h
                </button>
                <button
                  type="button"
                  className="jwt-gen-claim-btn"
                  onClick={() => addExp(86400)}
                  title="Add exp = now + 24 hours"
                >
                  exp +24h
                </button>
                <button
                  type="button"
                  className="jwt-gen-claim-btn"
                  onClick={() => addExp(604800)}
                  title="Add exp = now + 7 days"
                >
                  exp +7d
                </button>
                <button
                  type="button"
                  className="jwt-gen-claim-btn"
                  onClick={addJti}
                  title="Add jti (random UUID)"
                >
                  <RefreshCw size={11} />
                  jti
                </button>
              </div>
            </div>
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Generated Token"
            onCopy={generatedToken ? () => copyTokenHook.copy(generatedToken, (err) => setError(err)) : undefined}
            copied={copyTokenHook.copied}
          >
            <div className="jwt-gen-right-content">
              {generatedToken ? (
                <>
                  <div className="jwt-gen-token-output">{generatedToken}</div>

                  {decoded && (
                    <div className="jwt-gen-decoded">
                      <div className="jwt-gen-decoded-header">Decoded Preview</div>
                      <div className="jwt-gen-decoded-section">
                        <div className="jwt-gen-decoded-label">Header</div>
                        <pre className="jwt-gen-decoded-json">
                          <code>{decoded.header}</code>
                        </pre>
                      </div>
                      <div className="jwt-gen-decoded-section">
                        <div className="jwt-gen-decoded-label">Payload</div>
                        <pre className="jwt-gen-decoded-json">
                          <code>{decoded.payload}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="jwt-gen-placeholder">
                  Fill in the payload and secret, then click <strong>Generate</strong> to sign a JWT token.
                </div>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default JwtGenerator
