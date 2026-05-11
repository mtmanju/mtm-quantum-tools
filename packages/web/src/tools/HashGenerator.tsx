import { Check, Copy, FileText, Key, RefreshCw, Upload, X, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { generateHash, type HashAlgorithm } from '../utils/hash'
import { downloadTextFile } from '../utils/file'
import './HashGenerator.css'

const EXAMPLES = [
  { label: 'Hello World', text: 'Hello World' },
  { label: 'Lorem ipsum', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' },
  { label: 'JSON snippet', text: '{"user":"alice","role":"admin","ts":1700000000}' },
  { label: 'Password', text: 'MyS3cur3P@ssw0rd!' },
  { label: 'Empty string', text: '' },
]

const HashGenerator = () => {
  const [input, setInput] = useState('')
  const [hashes, setHashes] = useState<Record<HashAlgorithm, string>>({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyHashHooks = {
    md5: useCopy(),
    sha1: useCopy(),
    sha256: useCopy(),
    sha512: useCopy()
  }

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt']
    }
  })

  const generateAllHashes = useCallback(async () => {
    if (!input.trim()) {
      setError('Please enter text to hash')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const algorithms: HashAlgorithm[] = ['md5', 'sha1', 'sha256', 'sha512']
      const newHashes: Record<HashAlgorithm, string> = {
        md5: '',
        sha1: '',
        sha256: '',
        sha512: ''
      }

      for (const algo of algorithms) {
        try {
          const result = await generateHash(input, algo)
          newHashes[algo] = result.hash
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Hash generation failed')
        }
      }

      setHashes(newHashes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hash generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [input])

  // Auto-generate on input change
  useEffect(() => {
    if (input.trim()) {
      generateAllHashes()
    } else {
      setHashes({ md5: '', sha1: '', sha256: '', sha512: '' })
    }
  }, [input, generateAllHashes])

  const handleDownload = useCallback(() => {
    if (!input.trim() || Object.values(hashes).every(h => !h)) return

    const report = `Hash Report
Generated: ${new Date().toLocaleString()}

Input:
${input}

Hashes:
MD5:    ${hashes.md5}
SHA-1:  ${hashes.sha1}
SHA-256: ${hashes.sha256}
SHA-512: ${hashes.sha512}`

    downloadTextFile(report, 'hash-report.txt')
  }, [input, hashes])

  const handleClear = useCallback(() => {
    setInput('')
    setHashes({
      md5: '',
      sha1: '',
      sha256: '',
      sha512: ''
    })
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
      icon: <RefreshCw size={16} />,
      label: 'Regenerate',
      onClick: generateAllHashes,
      disabled: !input.trim() || isGenerating,
      title: 'Regenerate hashes',
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
      icon: <FileText size={16} />,
      label: 'Export',
      onClick: handleDownload,
      disabled: !input.trim() || Object.values(hashes).every(h => !h),
      title: 'Export hash report',
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

      <div className="hash-examples-bar">
        <span className="hash-examples-label">Try:</span>
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            type="button"
            className="hash-example-chip"
            onClick={() => {
              setInput(ex.text)
              setError('')
            }}
            title={ex.label}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {error && <ErrorBar message={error} />}

      {isGenerating && (
        <div className="hash-generating">
          <RefreshCw size={16} className="spinning" />
          <span>Generating hashes...</span>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="Input Text"
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
              placeholder="Enter text to generate hash..."
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .txt files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel title="Generated Hashes">
            <div className="hash-results">
              {!input.trim() ? (
                <div className="hash-empty-state">
                  <Key size={48} />
                  <p>Enter text to generate hashes</p>
                </div>
              ) : (
                <div className="hash-list">
                  {(['md5', 'sha1', 'sha256', 'sha512'] as HashAlgorithm[]).map((algo) => (
                    <div key={algo} className="hash-item">
                      <div className="hash-label">
                        <span className="hash-algorithm">{algo.toUpperCase()}</span>
                        {(algo === 'md5' || algo === 'sha1') && (
                          <span className="hash-weak-warning" title="Cryptographically broken — not suitable for security">
                            <AlertTriangle size={12} /> Weak
                          </span>
                        )}
                        <button
                          type="button"
                          className="hash-copy-btn"
                          onClick={() => copyHashHooks[algo].copy(hashes[algo], (err) => setError(err))}
                          disabled={!hashes[algo]}
                          title={`Copy ${algo.toUpperCase()} hash`}
                        >
                          {copyHashHooks[algo].copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <code className="hash-value">{hashes[algo] || '...'}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default HashGenerator

