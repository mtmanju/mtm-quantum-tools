import { Check, Copy, Upload, X, Zap, Send, Play, Info, Key } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { useHandoff } from '../hooks/useHandoff'
import './ApiTester.css'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
}

interface ApiExample {
  label: string
  description: string
  method: HttpMethod
  url: string
  headers?: string
  body?: string
}

const QUICK_EXAMPLES: ApiExample[] = [
  {
    label: 'GitHub user',
    description: 'GET a public profile',
    method: 'GET',
    url: 'https://api.github.com/users/octocat',
    headers: 'Accept: application/json',
  },
  {
    label: 'Random cat fact',
    description: 'GET a random fact',
    method: 'GET',
    url: 'https://catfact.ninja/fact',
    headers: 'Accept: application/json',
  },
  {
    label: 'JSONPlaceholder',
    description: 'GET a sample post',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: 'Accept: application/json',
  },
  {
    label: 'Create a post',
    description: 'POST with JSON body',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: 'Content-Type: application/json',
    body: '{\n  "title": "Hello",\n  "body": "Testing POST",\n  "userId": 1\n}',
  },
]

const ApiTester = () => {
  const [url, setUrl] = useState('https://api.github.com/users/octocat')
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [headers, setHeaders] = useState('Accept: application/json')
  const [body, setBody] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('api-tester', setBody)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  /** The in-flight request, so it can be abandoned rather than left to land. */
  const abortRef = useRef<AbortController | null>(null)

  /**
   * The origin the Authorization header was entered for.
   *
   * The header is ordinary `headers` state, so it survived any edit to the URL
   * bar and was serialised into every later request. Test an internal API,
   * paste a production token, then change the host to debug something else,
   * and the credential went to the new host with nothing on screen saying so.
   */
  const [authOrigin, setAuthOrigin] = useState<string | null>(null)

  // Abandon anything in flight when the tool unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])

  const copyHeadersHook = useCopy()
  const copyBodyHook = useCopy()
  const copyResponseHook = useCopy()

  const headersFileUpload = useFileUpload({
    onFileRead: (text) => {
      setHeaders(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt', '.headers']
    }
  })

  const bodyFileUpload = useFileUpload({
    onFileRead: (text) => {
      setBody(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.txt']
    }
  })

  const parseHeaders = useCallback((headersString: string): Record<string, string> => {
    const headersObj: Record<string, string> = {}
    if (!headersString.trim()) return headersObj

    headersString.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed) return
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim()
        const value = trimmed.substring(colonIndex + 1).trim()
        headersObj[key] = value
      }
    })

    return headersObj
  }, [])

  const handleSend = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    // Only allow http/https to prevent protocol injection
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.trim())
    } catch {
      setError('Invalid URL. Enter a valid http:// or https:// URL.')
      return
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      setResponse(null)
      setError('Only http:// and https:// URLs are supported')
      return
    }

    /**
     * Never send a bound credential to a different origin.
     *
     * Refusing rather than silently stripping: a request that quietly drops its
     * auth returns a confusing 401, and a request that quietly keeps it leaks
     * the token. Only headers added through the Bearer button are bound — a
     * hand-typed Authorization line is the user's own business.
     */
    const hasAuthHeader = /^\s*authorization\s*:/im.test(headers)
    if (hasAuthHeader && authOrigin && authOrigin !== parsedUrl.origin) {
      setResponse(null)
      setError(
        `The Authorization header was added for ${authOrigin}. It will not be sent to ${parsedUrl.origin} — remove it, or use "Add Bearer token" again to bind it to this host.`
      )
      return
    }

    // Supersede any request still running: its response must not overwrite this one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError('')
    setResponse(null)

    try {
      const startTime = Date.now()
      const parsedHeaders = parseHeaders(headers)
      
      const requestOptions: RequestInit = {
        method,
        headers: parsedHeaders,
        signal: controller.signal
      }

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        requestOptions.body = body
      }

      const res = await fetch(parsedUrl.href, requestOptions)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      let responseBody = ''
      const contentType = res.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        try {
          const json = await res.json()
          responseBody = JSON.stringify(json, null, 2)
        } catch {
          responseBody = await res.text()
        }
      } else {
        responseBody = await res.text()
      }

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      if (controller.signal.aborted) return
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: responseTime
      })
    } catch (err) {
      // An abort is a deliberate cancellation, not a failure to report.
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Request failed')
      setResponse(null)
    } finally {
      // Only the current request owns the loading flag; a superseded one
      // clearing it would hide the spinner for the request that replaced it.
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsLoading(false)
      }
    }
  }, [url, method, headers, body, parseHeaders, authOrigin])

  /**
   * Abandon the in-flight request.
   *
   * There was no way to stop one: the Send button disabled itself while
   * loading, so a request against a slow or hanging host left the tool stuck
   * on "Sending…" until the browser's own timeout, with the response then
   * landing over whatever the user had moved on to.
   */
  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
    setError('Request cancelled.')
  }, [])

  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
    setAuthOrigin(null)
    setUrl('')
    setHeaders('Accept: application/json')
    setBody('')
    setResponse(null)
    setError('')
  }, [])

  const handleLoadExample = useCallback((example: ApiExample) => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
    // The example replaces the headers box, so any bound credential is gone.
    setAuthOrigin(null)
    setMethod(example.method)
    setUrl(example.url)
    setHeaders(example.headers ?? '')
    setBody(example.body ?? '')
    setResponse(null)
    setError('')
  }, [])

  const handleAddBearerAuth = useCallback(() => {
    // Bind the credential to a concrete origin up front; without a valid URL
    // there is nothing to bind it to and no way to detect a later host change.
    let origin: string
    try {
      const parsed = new URL(url.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
      origin = parsed.origin
    } catch {
      setError('Enter the request URL first, so the token can be tied to that host.')
      return
    }

    const token = window.prompt('Enter Bearer token (just the token, no "Bearer" prefix):')
    if (!token) return
    const line = `Authorization: Bearer ${token.trim()}`
    setAuthOrigin(origin)
    setHeaders(prev => {
      const lines = prev.split('\n').filter(l => !/^\s*authorization\s*:/i.test(l))
      const next = lines.filter(Boolean).join('\n')
      return next ? `${next}\n${line}` : line
    })
  }, [url])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: bodyFileUpload.handleUploadClick,
      title: 'Upload request body file'
    },
    {
      icon: isLoading ? <Play size={16} /> : <Send size={16} />,
      label: isLoading ? 'Sending...' : 'Send',
      onClick: handleSend,
      disabled: !url.trim() || isLoading,
      title: 'Send request',
      showDividerBefore: true
    },
    {
      icon: copyResponseHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyResponseHook.copied ? 'Copied!' : 'Copy response',
      onClick: () => {
        if (response) {
          const responseText = JSON.stringify(response, null, 2)
          copyResponseHook.copy(responseText, (err) => setError(err))
        }
      },
      disabled: !response,
      title: 'Copy response',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !url.trim() && !headers.trim() && !body.trim(),
      title: 'Clear all',
      showDividerBefore: true
    }
  ]

  const responseStatusClass = useMemo(() => {
    if (!response) return ''
    if (response.status >= 200 && response.status < 300) return 'status-success'
    if (response.status >= 300 && response.status < 400) return 'status-redirect'
    if (response.status >= 400 && response.status < 500) return 'status-client-error'
    if (response.status >= 500) return 'status-server-error'
    return ''
  }, [response])

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {/* The headline here read "HTTP request tester — send any GET/POST/PUT/
          DELETE request and inspect the live response", which is the tool's
          name and its description: both already sit in the page header two
          rows above. Only the CORS caveat is information you cannot get
          anywhere else, so only it survives. */}
      <div className="api-intro">
        <Info size={12} aria-hidden="true" />
        <span>Runs in your browser, so the target API must allow CORS. Most public APIs do.</span>
      </div>

      <div className="api-examples-bar">
        <span className="api-examples-label">Try:</span>
        {QUICK_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="api-example-chip"
            onClick={() => handleLoadExample(ex)}
            title={`${ex.method} ${ex.url}`}
          >
            <span className={`api-example-method method-${ex.method.toLowerCase()}`}>{ex.method}</span>
            <span className="api-example-label">{ex.label}</span>
            <span className="api-example-desc">{ex.description}</span>
          </button>
        ))}
      </div>

      {error && <ErrorBar message={error} />}

      <div className="api-request-config">
        <div className="api-url-method">
          <select
            className="api-method-select"
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            aria-label="HTTP method"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
          <input
            type="text"
            className="api-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/users/1"
            aria-label="Request URL"
          />
          <button
            type="button"
            className="api-send-btn"
            onClick={isLoading ? handleCancel : handleSend}
            disabled={!url.trim() && !isLoading}
            title={isLoading ? 'Cancel request' : 'Send request (Ctrl+Enter)'}
          >
            {isLoading ? <X size={15} /> : <Send size={15} />}
            <span>{isLoading ? 'Cancel' : 'Send'}</span>
          </button>
        </div>
      </div>

      <EditorLayout
        left={
          <div className="api-request-panel">
            <EditorPanel
              title="Request Headers"
              onCopy={() => copyHeadersHook.copy(headers, (err) => setError(err))}
              copied={copyHeadersHook.copied}
            >
              <div className="api-headers-toolbar">
                <span className="api-headers-hint">One header per line, format: <code>Key: Value</code></span>
                <button
                  type="button"
                  className="api-headers-auth-btn"
                  onClick={handleAddBearerAuth}
                  title="Add an Authorization: Bearer header"
                >
                  <Key size={12} />
                  <span>Add Bearer token</span>
                </button>
              </div>
              <DropzoneTextarea
                {...headersFileUpload}
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="Content-Type: application/json&#10;Authorization: Bearer token"
                spellCheck={false}
                dropzoneText="Drag & drop headers file or paste"
                dropzoneHint="One header per line (Key: Value)"
                dropzoneActiveText="Drop file here"
              />
            </EditorPanel>
            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <EditorPanel
                title="Request Body"
                onCopy={() => copyBodyHook.copy(body, (err) => setError(err))}
                copied={copyBodyHook.copied}
              >
                <DropzoneTextarea
                  {...bodyFileUpload}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter request body (JSON, XML, etc.)..."
                  spellCheck={false}
                  dropzoneText="Drag & drop body file or paste"
                  dropzoneHint="Supports JSON, XML, or text"
                  dropzoneActiveText="Drop file here"
                />
              </EditorPanel>
            )}
          </div>
        }
        right={
          <EditorPanel
            title="Response"
            onCopy={() => {
              if (response) {
                const responseText = JSON.stringify(response, null, 2)
                copyResponseHook.copy(responseText, (err) => setError(err))
              }
            }}
            copied={copyResponseHook.copied}
          >
            <div className="api-response">
              {isLoading ? (
                <div className="api-loading">
                  <Zap size={48} />
                  <p>Sending request...</p>
                </div>
              ) : !response ? (
                <div className="api-empty-state">
                  <Send size={48} />
                  <p>Click <strong>Send</strong> to call the URL on the left.</p>
                  <p className="api-empty-state-sub">The response status, headers, and body will appear here.</p>
                </div>
              ) : (
                <>
                  <div className={`api-response-status ${responseStatusClass}`}>
                    <span className="api-status-code">{response.status}</span>
                    <span className="api-status-text">{response.statusText}</span>
                    <span className="api-response-time">{response.time}ms</span>
                  </div>
                  <div className="api-response-headers">
                    <h4>Response Headers:</h4>
                    <pre>{JSON.stringify(response.headers, null, 2)}</pre>
                  </div>
                  <div className="api-response-body">
                    <h4>Response Body:</h4>
                    <pre>{response.body}</pre>
                  </div>
                </>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default ApiTester

