import { useState, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, Copy, Check, X, FileText } from 'lucide-react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { useCopy } from '../hooks/useCopy'
import { 
  encodeToBase64, 
  decodeFromBase64, 
  fileToBase64, 
  base64ToBlob, 
  formatBase64, 
  minifyBase64,
  bytesToBase64
} from '../utils/base64'
import { saveAs } from 'file-saver'
import './Base64Converter.css'

const Base64Converter = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [error, setError] = useState('')
  const [detectedType, setDetectedType] = useState<string>('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  // Separate dropzones for encode and decode modes
  const encodeDropzone = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      
      const file = acceptedFiles[0]
      setError('')
      
      try {
        // In encode mode, convert file to Base64
        const base64 = await fileToBase64(file)
        setInput('') // Clear any text input
        setOutput(formatBase64(base64))
        setDetectedType(file.type || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file')
      }
    },
    accept: {
      '*/*': [] // Accept all files in encode mode
    },
    multiple: false,
    noClick: false // Allow click in encode mode
  })

  const decodeDropzone = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      
      const file = acceptedFiles[0]
      setError('')
      
      try {
        // In decode mode, treat as Base64 file
        const base64 = await fileToBase64(file)
        setInput(base64)
        setDetectedType(file.type || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file')
      }
    },
    accept: {
      'text/*': ['.txt', '.json', '.xml', '.html', '.css', '.js'],
      '*/*': []
    },
    multiple: false,
    noClick: true // Don't allow click in decode mode (use textarea)
  })

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setError('')
        try {
          if (mode === 'encode') {
            // In encode mode, convert file to Base64
            const base64 = await fileToBase64(file)
            setInput('') // Clear any text input
            setOutput(formatBase64(base64))
            setDetectedType(file.type || '')
          } else {
            // In decode mode, treat as Base64 file
            const base64 = await fileToBase64(file)
            setInput(base64)
            setDetectedType(file.type || '')
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to read file')
        }
      }
    }
    input.click()
  }, [mode])

  const decodeResult = useMemo(() => {
    if (!input.trim() || mode !== 'decode') return null
    
    // Don't set error immediately - let the validation run first
    const result = decodeFromBase64(input)
    
    if (!result.isValid) {
      // Show detailed error message
      const errorMsg = result.error || 'Invalid Base64 format'
      setError(errorMsg)
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Base64 decode error:', errorMsg)
        console.log('Input length:', input.length)
        console.log('Input preview (first 100 chars):', input.substring(0, 100))
        console.log('Input preview (last 100 chars):', input.substring(Math.max(0, input.length - 100)))
      }
      
      return null
    }
    
    // Clear error if validation passes
    setError('')
    
    if (result.mimeType) {
      setDetectedType(result.mimeType)
    } else {
      setDetectedType('')
    }
    
    return result
  }, [input, mode])

  // Update output when input changes in encode mode (text input)
  useMemo(() => {
    if (mode === 'encode' && input.trim() && !output) {
      setError('')
      try {
        const encoded = encodeToBase64(input)
        setOutput(formatBase64(encoded))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to encode')
        setOutput('')
      }
    } else if (mode === 'decode') {
      // For decode mode, calculate output from decodeResult
      if (decodeResult) {
        // If it's a binary file (image, PDF, etc.), don't show decoded text
        if (decodeResult.mimeType && 
            (decodeResult.mimeType.startsWith('image/') || 
             decodeResult.mimeType === 'application/pdf' || 
             decodeResult.mimeType === 'application/zip' ||
             decodeResult.mimeType === 'application/octet-stream')) {
          setOutput('') // Will be handled by preview/download
        } else {
          setOutput(decodeResult.decoded || '')
        }
      } else {
        setOutput('')
      }
    }
  }, [input, mode, decodeResult, output])

  const displayOutput = useMemo(() => {
    if (mode === 'encode') {
      return output
    } else {
      return output
    }
  }, [mode, output])

  const handleDownload = useCallback(() => {
    if (mode !== 'decode' || !decodeResult) return

    if (!decodeResult.isValid || !decodeResult.decodedBytes) return

    const mimeType = detectedType || decodeResult.mimeType || 'application/octet-stream'
    const blob = base64ToBlob(input, mimeType)
    
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

    saveAs(blob, `decoded.${extension}`)
  }, [input, mode, detectedType, decodeResult])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError('')
    setDetectedType('')
    // Reset copy state by copying empty string
    copyInputHook.copy('', () => {})
    copyOutputHook.copy('', () => {})
  }, [copyInputHook, copyOutputHook])

  const handleFormat = useCallback(() => {
    if (!output.trim() || mode !== 'encode') return
    setOutput(formatBase64(output))
  }, [output, mode])

  const handleMinify = useCallback(() => {
    if (!output.trim() || mode !== 'encode') return
    setOutput(minifyBase64(output))
  }, [output, mode])

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
      label: copyInputHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyInputHook.copy(input, (err) => setError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyOutputHook.copy(displayOutput, (err) => setError(err)),
      disabled: !displayOutput.trim(),
      title: 'Copy output'
    },
    {
      icon: <Download size={16} />,
      label: 'Save',
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

      <div className="base64-mode-selector">
        <button
          type="button"
          className={`base64-mode-btn ${mode === 'encode' ? 'active' : ''}`}
          onClick={() => {
            setMode('encode')
            setError('')
            setDetectedType('')
            setInput('')
            setOutput('')
          }}
        >
          To Base64
        </button>
        <button
          type="button"
          className={`base64-mode-btn ${mode === 'decode' ? 'active' : ''}`}
          onClick={() => {
            setMode('decode')
            setError('')
            setOutput('')
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
            title={mode === 'encode' ? 'Upload File' : 'Base64 to Decode'}
            onCopy={() => copyInputHook.copy(input, (err) => setError(err))}
            copied={copyInputHook.copied}
          >
            {mode === 'encode' ? (
              <div 
                className="base64-upload-area" 
                {...encodeDropzone.getRootProps({
                  onClick: (e: React.MouseEvent) => {
                    // Prevent file picker from opening when clicking on the uploaded info
                    const target = e.target as HTMLElement
                    if (target.closest('.base64-uploaded-info')) {
                      e.stopPropagation()
                      e.preventDefault()
                      return false
                    }
                  }
                })}
              >
                <input {...encodeDropzone.getInputProps()} />
                {encodeDropzone.isDragActive ? (
                  <div className="base64-upload-active">
                    <Upload size={48} />
                    <p>Drop file here to convert to Base64</p>
                  </div>
                ) : (
                  <div className="base64-upload-placeholder">
                    <Upload size={48} />
                    <p className="base64-upload-title">Drag & drop a file here</p>
                    <p className="base64-upload-subtitle">or click to browse</p>
                    <p className="base64-upload-hint">Supports any file type</p>
                  </div>
                )}
                {output && (
                  <div className="base64-uploaded-info" onClick={(e) => e.stopPropagation()}>
                    <FileText size={16} />
                    <span>File converted to Base64 ({detectedType || 'unknown type'})</span>
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
                  const value = e.target.value
                  setInput(value)
                  setError('')
                  // Only validate if there's content
                  if (value.trim()) {
                    const result = decodeFromBase64(value)
                    if (result.isValid && result.mimeType) {
                      setDetectedType(result.mimeType)
                    } else if (!result.isValid) {
                      // Don't set error on every keystroke, only show it when user stops typing
                      // The error will be shown by the decodeResult useMemo
                    } else {
                      setDetectedType('')
                    }
                  } else {
                    setDetectedType('')
                  }
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
                    setError('')
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
            onCopy={() => copyOutputHook.copy(displayOutput, (err) => setError(err))}
            copied={copyOutputHook.copied}
            headerActions={
              mode === 'decode' && isBinaryFile && decodeResult ? (
                <button
                  type="button"
                  className="editor-panel-copy-btn"
                  onClick={handleDownload}
                  title={isImage ? 'Download image' : 'Download file'}
                >
                  <Download size={14} />
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
                    setError(errorMsg)
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
            ) : mode === 'decode' && isBinaryFile && decodeResult && !isImage ? (
              <div className="base64-binary-preview">
                <FileText size={48} />
                <h3>{detectedType || 'Binary File'}</h3>
                <p>This is a binary file ({decodeResult.decodedBytes?.length || 0} bytes)</p>
                <p className="base64-binary-hint">Use the download button above to save the file</p>
                {detectedType === 'application/pdf' && (
                  <p className="base64-binary-note">PDF files cannot be previewed in the browser</p>
                )}
              </div>
            ) : !displayOutput.trim() ? (
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

