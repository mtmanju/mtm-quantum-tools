import { Check, Copy, Upload, X, Key, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { generateHash, type HashAlgorithm } from '../utils/hash'
import './HashGenerator.css'

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
  useMemo(() => {
    if (input.trim()) {
      generateAllHashes()
    } else {
      setHashes({
        md5: '',
        sha1: '',
        sha256: '',
        sha512: ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

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

