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
import { useHandoff } from '../hooks/useHandoff'
import './HashGenerator.css'

const EXAMPLES = [
  { label: 'Hello World', text: 'Hello World' },
  { label: 'Lorem ipsum', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' },
  { label: 'JSON snippet', text: '{"user":"alice","role":"admin","ts":1700000000}' },
  { label: 'Password', text: 'MyS3cur3P@ssw0rd!' },
  { label: 'Empty string', text: '' },
]

const EMPTY_HASHES: Record<HashAlgorithm, string> = {
  md5: '', sha1: '', sha256: '', sha512: '',
}

const HashGenerator = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('hash-generator', setInput)
  /**
   * The hashes, tagged with the input they were computed from.
   *
   * Keeping the two together is what makes `hashes` and `isGenerating`
   * derivable instead of separately-managed state, and it fixes a real race:
   * hashing is async, so with a plain `setHashes` a slow digest of an earlier
   * input could resolve after a newer one and leave the panel showing hashes
   * that do not belong to the text on screen. A result whose `forInput` no
   * longer matches is simply ignored.
   */
  const [result, setResult] = useState<{ forInput: string; hashes: Record<HashAlgorithm, string> }>(
    { forInput: '', hashes: EMPTY_HASHES }
  )
  const [error, setError] = useState('')

  // Both derived — see the note above. Neither needs to be written by hand,
  // and neither can now disagree with the input.
  const hashes = result.forInput === input ? result.hashes : EMPTY_HASHES
  const isGenerating = input.trim() !== '' && result.forInput !== input

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

  /**
   * Hash whatever is in the box, whenever it changes.
   *
   * Every setState here happens *after* an await. That is what the new
   * react-hooks/set-state-in-effect rule is asking for, and the reason it
   * asks: a synchronous setState in an effect body is a second render pass
   * for something that could have been computed during the first. The two
   * values that genuinely could be — `hashes` and `isGenerating` — are now
   * derived above, so all that is left in the effect is the async work.
   *
   * `cancelled` is not ceremony. Digests of a long input take long enough
   * that typing another character before the previous run finishes is
   * routine, and without the guard the older run still calls setResult.
   */
  useEffect(() => {
    if (!input.trim()) return

    let cancelled = false

    void (async () => {
      const algorithms: HashAlgorithm[] = ['md5', 'sha1', 'sha256', 'sha512']
      const next: Record<HashAlgorithm, string> = { ...EMPTY_HASHES }

      try {
        for (const algo of algorithms) {
          const { hash } = await generateHash(input, algo)
          if (cancelled) return
          next[algo] = hash
        }
        setResult({ forInput: input, hashes: next })
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Hash generation failed')
      }
    })()

    return () => { cancelled = true }
  }, [input])

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
    // `hashes` is derived from the input, so clearing the input clears them.
    setInput('')
    setError('')
  }, [])

  /**
   * "Regenerate" now discards the tagged result rather than re-running the
   * hash directly. The effect above owns the computation; this just makes it
   * out of date, which is the one thing that makes it run again. Keeping a
   * second path into the same work is how the two got to disagree.
   */
  const handleRegenerate = useCallback(() => {
    setResult({ forInput: '', hashes: EMPTY_HASHES })
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
      onClick: handleRegenerate,
      disabled: !input.trim() || isGenerating,
      title: 'Regenerate hashes',
      showDividerBefore: true
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy input',
      onClick: () => copyInputHook.copy(input, (err) => setError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: <FileText size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !input.trim() || Object.values(hashes).every(h => !h),
      title: 'Download hash report',
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
                          <span className="hash-weak-warning" title="Cryptographically broken. Not suitable for security.">
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

