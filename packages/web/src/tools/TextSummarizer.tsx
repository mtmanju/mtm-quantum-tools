import { Check, Copy, Download, Upload, X, FileText } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { summarizeText } from '../utils/textAnalysis'
import './TextSummarizer.css'

const TextSummarizer = () => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'sentences' | 'words'>('sentences')
  const [count, setCount] = useState(3)
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  })

  const output = useMemo(() => {
    if (!input.trim()) return ''

    try {
      const options = mode === 'sentences'
        ? { maxSentences: count }
        : { maxWords: count }

      return summarizeText(input, options)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarization failed')
      return ''
    }
  }, [input, mode, count])

  const handleDownload = useCallback(() => {
    if (!output.trim()) return

    const report = `Text Summary
Generated: ${new Date().toLocaleString()}
Mode: ${mode === 'sentences' ? 'By Sentences' : 'By Words'}
${mode === 'sentences' ? `Sentences: ${count}` : `Words: ${count}`}

---
Summary:
${output}

---
Original Text:
${input}`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'text-summary.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [output, input, mode, count])

  const handleClear = useCallback(() => {
    setInput('')
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
      icon: <Download size={16} />,
      label: 'Export',
      onClick: handleDownload,
      disabled: !output.trim(),
      title: 'Export summary',
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

      <div className="text-summarizer-controls">
        <div className="text-summarizer-mode-selector">
          <button
            type="button"
            className={`text-summarizer-mode-btn ${mode === 'sentences' ? 'active' : ''}`}
            onClick={() => {
              setMode('sentences')
              setCount(3)
            }}
          >
            By Sentences
          </button>
          <button
            type="button"
            className={`text-summarizer-mode-btn ${mode === 'words' ? 'active' : ''}`}
            onClick={() => {
              setMode('words')
              setCount(50)
            }}
          >
            By Words
          </button>
        </div>

        <div className="text-summarizer-count-input">
          <label htmlFor="summarizer-count">
            {mode === 'sentences' ? 'Number of sentences:' : 'Number of words:'}
          </label>
          <input
            id="summarizer-count"
            type="number"
            min="1"
            max={mode === 'sentences' ? 20 : 500}
            value={count}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!isNaN(value) && value > 0) {
                const max = mode === 'sentences' ? 20 : 500
                setCount(Math.min(value, max))
              }
            }}
            className="text-summarizer-count-field"
          />
        </div>
      </div>

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title="Original Text"
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
              placeholder="Paste or type text to summarize..."
              spellCheck={true}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .txt, .md files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Summary"
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            {!input.trim() ? (
              <div className="text-summarizer-empty-state">
                <FileText size={48} />
                <p>Enter text to generate summary</p>
              </div>
            ) : (
              <div className="text-summarizer-output">
                {output.split('\n\n').map((para, idx) => (
                  <p key={idx} className="text-summarizer-paragraph">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default TextSummarizer

