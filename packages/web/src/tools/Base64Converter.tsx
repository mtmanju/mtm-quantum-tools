import { Check, Copy, FileDown, FileText, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { downloadBinaryFile } from '../utils/file'
import { useHandoff } from '../hooks/useHandoff'
import {
  bytesToBase64,
  decodeFromBase64,
  encodeToBase64,
  fileToBase64,
  formatBase64,
  minifyBase64
} from '../utils/base64'
import './Base64Converter.css'

const ENCODE_EXAMPLES = [
  { label: 'Greeting', text: 'Hello, World!' },
  { label: 'Auth header', text: 'username:password' },
  { label: 'JSON', text: '{"name":"Alice","active":true}' },
  { label: 'URL', text: 'https://example.com/path?q=test' },
]

const DECODE_EXAMPLES = [
  { label: 'Greeting', text: 'SGVsbG8sIFdvcmxkIQ==' },
  { label: 'Auth header', text: 'dXNlcm5hbWU6cGFzc3dvcmQ=' },
  { label: 'JSON', text: 'eyJuYW1lIjoiQWxpY2UiLCJhY3RpdmUiOnRydWV9' },
  { label: 'URL', text: 'aHR0cHM6Ly9leGFtcGxlLmNvbS9wYXRoP3E9dGVzdA==' },
]

/**
 * The encode-mode file input is driven by <label for>, not by a scripted
 * .click() on a hidden input — the latter is silently ignored by some
 * browsers, which left the "Choose file" button doing nothing while
 * drag-and-drop (a different code path) worked fine.
 */
const ENCODE_FILE_INPUT_ID = 'base64-encode-file-input'

/** A file the user encoded, when the source is a file rather than typed text. */
interface EncodedFile {
  base64: string
  mimeType: string
  name: string
}

const Base64Converter = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('base64-converter', setInput)
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  /**
   * Errors raised by user *actions* (file read, clipboard). Conversion errors
   * are derived below, never stored — storing them meant the message could
   * lag a render behind the value that caused it.
   */
  const [actionError, setActionError] = useState('')
  const [encodedFile, setEncodedFile] = useState<EncodedFile | null>(null)
  /** Whether Base64 output is wrapped at 76 chars or emitted as one line. */
  const [wrap, setWrap] = useState(true)

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  // Separate dropzones for encode and decode modes
  const encodeDropzone = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      
      const file = acceptedFiles[0]
      setActionError('')
      
      try {
        // In encode mode, convert file to Base64
        const base64 = await fileToBase64(file)
        setInput('') // a file supersedes any typed text
        setEncodedFile({ base64, mimeType: file.type || '', name: file.name })
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to read file')
      }
    },
    // No accept map: any file type can be encoded.
    multiple: false,
    // The encode pane wraps a textarea, so a click must place the caret rather
    // than open a file dialog. Files come from the drop target or the explicit
    // "Choose file" button.
    noClick: true,
  })

  const decodeDropzone = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      
      const file = acceptedFiles[0]
      setActionError('')
      
      try {
        // In decode mode, treat the file's contents as Base64 to decode
        const base64 = await fileToBase64(file)
        setInput(base64)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to read file')
      }
    },
    // The file is read as text and treated as Base64, so any type is allowed.
    multiple: false,
    noClick: true // Don't allow click in decode mode (use textarea)
  })

  /**
   * Opens the OS file picker via react-dropzone's `open()`.
   *
   * This used to build a detached `<input type="file">` and call .click() on
   * it. Browsers refuse to show a picker for an input that was never inserted
   * into the document, so the button silently did nothing. `open()` drives the
   * same hidden input react-dropzone already renders (and which is in the DOM),
   * so the picker actually appears and the normal onDrop path runs.
   */
  const handleUploadClick = useCallback(() => {
    setActionError('')
    if (mode === 'encode') {
      // Prefer the real, labelled input: clicking it directly is honoured by
      // every browser, whereas react-dropzone's open() goes through a hidden
      // input that some browsers refuse to open a picker for.
      const el = document.getElementById(ENCODE_FILE_INPUT_ID) as HTMLInputElement | null
      if (el) el.click()
      else encodeDropzone.open()
    } else {
      decodeDropzone.open()
    }
  }, [mode, encodeDropzone, decodeDropzone])

  /**
   * Everything downstream of the input is derived, not stored.
   *
   * This used to keep `output` in state and write to it from inside a
   * useMemo, guarded by `!output` — so once anything had been converted the
   * guard was false forever and editing the input silently stopped updating
   * the result. The only way to get a new answer was to reload the page.
   */
  const conversion = useMemo(() => {
    if (mode === 'encode') {
      // A file takes precedence until the user types over it.
      if (encodedFile) {
        return {
          output: wrap ? formatBase64(encodedFile.base64) : minifyBase64(encodedFile.base64),
          error: '',
          mimeType: encodedFile.mimeType,
          decode: null,
        }
      }
      if (!input.trim()) return { output: '', error: '', mimeType: '', decode: null }
      try {
        const encoded = encodeToBase64(input)
        return {
          output: wrap ? formatBase64(encoded) : minifyBase64(encoded),
          error: '',
          mimeType: '',
          decode: null,
        }
      } catch (err) {
        return {
          output: '',
          error: err instanceof Error ? err.message : 'Failed to encode',
          mimeType: '',
          decode: null,
        }
      }
    }

    // decode
    if (!input.trim()) return { output: '', error: '', mimeType: '', decode: null }
    const result = decodeFromBase64(input)
    if (!result.isValid) {
      return {
        output: '',
        error: result.error || 'Invalid Base64 format',
        mimeType: '',
        decode: null,
      }
    }

    const mimeType = result.mimeType || ''
    const isBinary =
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/zip' ||
      mimeType === 'application/octet-stream'

    return {
      // Binary payloads are shown as a preview / download, not as text.
      output: isBinary ? '' : result.decoded || '',
      error: '',
      mimeType,
      decode: result,
    }
  }, [input, mode, encodedFile, wrap])

  const decodeResult = conversion.decode
  const detectedType = conversion.mimeType
  const output = conversion.output
  const displayOutput = output
  const error = actionError || conversion.error

  const handleDownload = useCallback(() => {
    if (mode !== 'decode' || !decodeResult) return

    if (!decodeResult.isValid || !decodeResult.decodedBytes) return

    const mimeType = detectedType || decodeResult.mimeType || 'application/octet-stream'
    
    // Use the decoded bytes directly to create the blob (more reliable than re-decoding)
    // Create a new Uint8Array by copying the bytes to ensure proper type compatibility
    const bytes = new Uint8Array(decodeResult.decodedBytes.length)
    bytes.set(decodeResult.decodedBytes)
    const blob = new Blob([bytes], { type: mimeType })
    
    // Determine file extension from MIME type
    let extension = 'bin'
    if (mimeType.startsWith('image/')) {
      extension = mimeType.split('/')[1].split(';')[0]
    } else if (mimeType === 'application/pdf') {
      extension = 'pdf'
    } else if (mimeType === 'application/json') {
      extension = 'json'
    } else if (mimeType === 'application/zip') {
      extension = 'zip'
    } else if (mimeType.startsWith('text/')) {
      extension = mimeType.split('/')[1] || 'txt'
    }

    downloadBinaryFile(blob, `decoded.${extension}`, mimeType)
  }, [mode, detectedType, decodeResult])

  const handleClear = useCallback(() => {
    setInput('')
    setEncodedFile(null)
    setActionError('')
  }, [])

  // Wrapping is a view preference, so it re-derives instead of mutating the
  // result — toggling it back and forth is now lossless.
  const handleFormat = useCallback(() => setWrap(true), [])
  const handleMinify = useCallback(() => setWrap(false), [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: handleUploadClick,
      title: 'Upload file to encode or Base64 to decode'
    },
    {
      icon: <FileText size={16} />,
      label: 'Format',
      onClick: handleFormat,
      disabled: !input.trim() || mode !== 'encode',
      title: 'Format Base64 with line breaks'
    },
    {
      icon: <X size={16} />,
      label: 'Minify',
      onClick: handleMinify,
      disabled: !input.trim(),
      title: 'Remove all whitespace'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy input',
      onClick: () => copyInputHook.copy(input, (err) => setActionError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy output',
      onClick: () => copyOutputHook.copy(displayOutput, (err) => setActionError(err)),
      disabled: !displayOutput.trim(),
      title: 'Copy output'
    },
    {
      icon: <FileDown size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !output.trim() || mode !== 'decode',
      title: 'Download decoded file',
      showDividerBefore: true
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

  const isImage = useMemo(() => {
    if (mode !== 'decode' || !decodeResult) return false
    const mimeType = detectedType || decodeResult.mimeType
    return mimeType ? mimeType.startsWith('image/') : false
  }, [mode, detectedType, decodeResult])

  const isBinaryFile = useMemo(() => {
    if (mode !== 'decode' || !decodeResult) return false
    const mimeType = detectedType || decodeResult.mimeType
    if (!mimeType) return false
    
    // Binary files that should be downloaded, not displayed as text
    return mimeType.startsWith('image/') || 
           mimeType === 'application/pdf' || 
           mimeType === 'application/zip' ||
           mimeType === 'application/octet-stream' ||
           (decodeResult.decodedBytes && decodeResult.decodedBytes.length > 0 && decodeResult.decoded === undefined)
  }, [mode, detectedType, decodeResult])

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      <div className="b64-examples-bar">
        <span className="b64-examples-label">Try:</span>
        {(mode === 'encode' ? ENCODE_EXAMPLES : DECODE_EXAMPLES).map(ex => (
          <button
            key={ex.label}
            type="button"
            className="b64-example-chip"
            onClick={() => {
              setActionError('')
              setEncodedFile(null)
              setInput(ex.text)
            }}
            title={ex.label}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="base64-mode-selector">
        <button
          type="button"
          className={`base64-mode-btn ${mode === 'encode' ? 'active' : ''}`}
          onClick={() => {
            setMode('encode')
            setActionError('')
            setEncodedFile(null)
            setInput('')
          }}
        >
          To Base64
        </button>
        <button
          type="button"
          className={`base64-mode-btn ${mode === 'decode' ? 'active' : ''}`}
          onClick={() => {
            setMode('decode')
            setActionError('')
            setEncodedFile(null)
            setInput('')
          }}
        >
          From Base64
        </button>
      </div>

      {error && <ErrorBar message={error} />}

      {detectedType && mode === 'decode' && (
        <div className="base64-type-indicator">
          <FileText size={16} />
          <span>Detected type: {detectedType}</span>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'encode' ? 'Text or File' : 'Base64 to Decode'}
            onCopy={() => copyInputHook.copy(input, (err) => setActionError(err))}
            copied={copyInputHook.copied}
          >
            {mode === 'encode' ? (
              // The pane itself owns the dropzone root and the single hidden
              // file input. Rendering a second input from the same dropzone
              // instance makes the two share one ref, and whichever mounted
              // last silently swallows the selection.
              <div className="base64-encode-pane" {...encodeDropzone.getRootProps()}>
                <input
                  {...encodeDropzone.getInputProps({
                    id: ENCODE_FILE_INPUT_ID,
                    // react-dropzone defaults to display:none, which some
                    // browsers refuse to open a picker for. Visually hidden but
                    // still rendered keeps <label> activation reliable.
                    style: {
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      opacity: 0,
                      pointerEvents: 'none',
                    },
                  })}
                />

                {encodedFile ? (
                  <div className="base64-file-card">
                    <FileText size={20} />
                    <div className="base64-file-meta">
                      <span className="base64-file-name">{encodedFile.name}</span>
                      <span className="base64-file-sub">
                        {encodedFile.mimeType || 'unknown type'} · encoded to Base64
                      </span>
                    </div>
                    <div className="base64-file-actions">
                      <label className="base64-file-label" htmlFor={ENCODE_FILE_INPUT_ID}>
                        Replace
                      </label>
                      <button type="button" onClick={() => setEncodedFile(null)}>Use text</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      className="base64-encode-textarea"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        setActionError('')
                      }}
                      placeholder="Type or paste text to encode, or drop a file here"
                      spellCheck={false}
                      aria-label="Text to encode"
                    />
                    <div className="base64-file-prompt">
                      <span>Encoding a file instead?</span>
                      <label className="base64-file-label" htmlFor={ENCODE_FILE_INPUT_ID}>
                        <Upload size={13} />
                        Choose file
                      </label>
                      <span className="base64-file-prompt-hint">
                        any type: PNG, JPG, PDF, ZIP, binary
                      </span>
                    </div>
                  </>
                )}

                {encodeDropzone.isDragActive && (
                  <div className="base64-drop-overlay">
                    <Upload size={32} />
                    <p>Drop file to encode</p>
                  </div>
                )}
              </div>
            ) : (
              <DropzoneTextarea
                {...{ 
                  getRootProps: decodeDropzone.getRootProps, 
                  getInputProps: decodeDropzone.getInputProps, 
                  isDragActive: decodeDropzone.isDragActive 
                }}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setActionError('')
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text')
                  if (pastedText) {
                    // Clean the pasted text - remove any extra whitespace and invalid characters
                    let cleaned = pastedText.trim()
                    
                    // Remove data URL prefix if present
                    if (cleaned.includes(',')) {
                      cleaned = cleaned.split(',')[1] || cleaned
                    }
                    
                    // Remove all whitespace (including line breaks from formatted Base64)
                    cleaned = cleaned.replace(/\s+/g, '')
                    
                    // Use minifyBase64 to ensure it's clean (removes any remaining whitespace)
                    cleaned = minifyBase64(cleaned)
                    
                    setInput(cleaned)
                    setActionError('')
                  }
                }}
                placeholder="Enter Base64 string to decode..."
                spellCheck={false}
                dropzoneText="Drag & drop Base64 file or paste content"
                dropzoneHint="Upload a Base64 file or paste Base64 string"
                dropzoneActiveText="Drop file here"
              />
            )}
          </EditorPanel>
        }
        right={
          <EditorPanel
            title={mode === 'encode' ? 'Base64 Encoded' : 'Decoded Output'}
            onCopy={() => copyOutputHook.copy(displayOutput, (err) => setActionError(err))}
            copied={copyOutputHook.copied}
            headerActions={
              mode === 'decode' && isBinaryFile && decodeResult ? (
                <button
                  type="button"
                  className="editor-panel-copy-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDownload()
                  }}
                  title={isImage ? 'Download image' : 'Download file'}
                >
                  <FileDown size={14} />
                </button>
              ) : undefined
            }
          >
            {mode === 'decode' && isImage && decodeResult && decodeResult.decodedBytes ? (
              <div className="base64-image-preview">
                <img 
                  src={`data:${detectedType || decodeResult.mimeType || 'image/png'};base64,${bytesToBase64(decodeResult.decodedBytes)}`} 
                  alt="Decoded image"
                  onError={(e) => {
                    const errorMsg = 'Failed to display image. The Base64 string may be corrupted or incomplete. Try using the download button instead.'
                    setActionError(errorMsg)
                    if (process.env.NODE_ENV === 'development') {
                      console.error('Image decode error:', e)
                      console.log('MIME type:', detectedType || decodeResult.mimeType)
                      console.log('Input length:', input.length)
                      console.log('Decoded bytes length:', decodeResult.decodedBytes?.length)
                      console.log('Decode result valid:', decodeResult.isValid)
                    }
                  }}
                />
              </div>
            ) : mode === 'decode' && isBinaryFile && decodeResult && decodeResult.isValid && decodeResult.decodedBytes && !isImage ? (
              <div className="base64-binary-preview">
                <FileText size={48} />
                <h3>{(() => {
                  const mimeType = detectedType || decodeResult.mimeType || ''
                  if (mimeType === 'application/pdf') return 'PDF Document'
                  if (mimeType === 'application/zip') return 'ZIP Archive'
                  if (mimeType === 'application/octet-stream') return 'Binary File'
                  if (mimeType) {
                    // Extract file type from MIME type (e.g., "application/json" -> "JSON File")
                    const parts = mimeType.split('/')
                    if (parts.length === 2) {
                      const subtype = parts[1].split(';')[0].charAt(0).toUpperCase() + parts[1].split(';')[0].slice(1)
                      return `${subtype} File`
                    }
                  }
                  return 'Binary File'
                })()}</h3>
                <p className="base64-binary-size">File size: {(() => {
                  const bytes = decodeResult.decodedBytes.length
                  if (bytes < 1024) return `${bytes} bytes`
                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
                  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
                })()}</p>
                {detectedType === 'application/pdf' ? (
                  <>
                    <p className="base64-binary-hint">PDF files cannot be previewed in the browser</p>
                    <button
                      type="button"
                      className="base64-download-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDownload()
                      }}
                    >
                      <FileDown size={18} />
                      <span>Download PDF</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="base64-binary-hint">Use the download button above to save the file</p>
                    <button
                      type="button"
                      className="base64-download-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDownload()
                      }}
                    >
                      <FileDown size={18} />
                      <span>Download File</span>
                    </button>
                  </>
                )}
              </div>
            ) : !displayOutput.trim() && (mode === 'encode' || (mode === 'decode' && (!decodeResult || !isBinaryFile || isImage))) ? (
              <div className="base64-empty-state">
                <FileText size={48} />
                <p>{mode === 'encode' ? 'Upload a file to convert to Base64' : 'Enter Base64 string to decode'}</p>
              </div>
            ) : (
              <pre className="base64-output">
                <code>{displayOutput}</code>
              </pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default Base64Converter

