import { Check, Copy, Download, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { analyzeText } from '../utils/textAnalysis'
import { downloadTextFile } from '../utils/file'
import './WordCounter.css'

const WordCounter = () => {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const stats = useMemo(() => analyzeText(text), [text])

  const fileUpload = useFileUpload({
    onFileRead: (content) => {
      setText(content)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html', '.htm']
    }
  })

  const handleDownload = useCallback(() => {
    if (!text.trim()) return

    const report = `Word Count Report
Generated: ${new Date().toLocaleString()}

Statistics:
- Words: ${stats.words.toLocaleString()}
- Characters: ${stats.characters.toLocaleString()}
- Characters (no spaces): ${stats.charactersNoSpaces.toLocaleString()}
- Sentences: ${stats.sentences.toLocaleString()}
- Paragraphs: ${stats.paragraphs.toLocaleString()}
- Lines: ${stats.lines.toLocaleString()}
- Reading Time: ${stats.readingTime} minutes

---
Original Text:
${text}`

    downloadTextFile(report, 'word-count-report.txt')
  }, [text, stats])

  const handleClear = useCallback(() => {
    setText('')
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
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyHook.copy(text, (err) => setError(err)),
      disabled: !text.trim(),
      title: 'Copy text',
      showDividerBefore: true
    },
    {
      icon: <Download size={16} />,
      label: 'Export',
      onClick: handleDownload,
      disabled: !text.trim(),
      title: 'Export report',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !text.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="word-counter-container">
        <EditorPanel
          title="Text Input"
          onCopy={() => copyHook.copy(text, (err) => setError(err))}
          copied={copyHook.copied}
        >
          <DropzoneTextarea
            {...fileUpload}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            placeholder="Paste or type text here to analyze..."
            spellCheck={true}
            dropzoneText="Drag & drop file or paste"
            dropzoneHint="Supports .txt, .md, .html files"
            dropzoneActiveText="Drop file here"
          />
        </EditorPanel>

        {text.trim() && (
          <div className="word-counter-stats">
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.words.toLocaleString()}</div>
              <div className="word-counter-stat-label">Words</div>
            </div>
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.characters.toLocaleString()}</div>
              <div className="word-counter-stat-label">Characters</div>
            </div>
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.charactersNoSpaces.toLocaleString()}</div>
              <div className="word-counter-stat-label">Characters (no spaces)</div>
            </div>
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.sentences.toLocaleString()}</div>
              <div className="word-counter-stat-label">Sentences</div>
            </div>
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.paragraphs.toLocaleString()}</div>
              <div className="word-counter-stat-label">Paragraphs</div>
            </div>
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.lines.toLocaleString()}</div>
              <div className="word-counter-stat-label">Lines</div>
            </div>
            <div className="word-counter-stat-card">
              <div className="word-counter-stat-value">{stats.readingTime}</div>
              <div className="word-counter-stat-label">Reading Time (min)</div>
            </div>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default WordCounter

