import { Check, Copy, Upload, X, GitCompare, FileText } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { computeDiff } from '../utils/diff'
import './DiffChecker.css'

const DiffChecker = () => {
  const [oldText, setOldText] = useState('')
  const [newText, setNewText] = useState('')
  const [error, setError] = useState('')

  const copyOldHook = useCopy()
  const copyNewHook = useCopy()
  const copyDiffHook = useCopy()

  const diffResult = useMemo(() => {
    if (!oldText.trim() && !newText.trim()) {
      return null
    }
    return computeDiff(oldText, newText)
  }, [oldText, newText])

  const diffOutput = useMemo(() => {
    if (!diffResult) return ''
    
    let output = `Diff Summary:\n`
    output += `  Insertions: ${diffResult.insertions}\n`
    output += `  Deletions: ${diffResult.deletions}\n`
    output += `  Total Changes: ${diffResult.changes}\n\n`
    output += `Line-by-line diff:\n\n`
    
    diffResult.lines.forEach((line) => {
      const prefix = line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' '
      const lineNum = line.type === 'insert' ? line.newLineNumber : line.type === 'delete' ? line.oldLineNumber : line.oldLineNumber || line.newLineNumber
      output += `${prefix} ${lineNum?.toString().padStart(4, ' ') || '    '} | ${line.content}\n`
    })
    
    return output
  }, [diffResult])

  const oldTextFileUpload = useFileUpload({
    onFileRead: (text) => {
      setOldText(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt'],
      'text/*': ['.*']
    }
  })

  const newTextFileUpload = useFileUpload({
    onFileRead: (text) => {
      setNewText(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt'],
      'text/*': ['.*']
    }
  })

  const handleClear = useCallback(() => {
    setOldText('')
    setNewText('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: oldTextFileUpload.handleUploadClick,
      title: 'Upload old text file'
    },
    {
      icon: copyOldHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOldHook.copied ? 'Copied!' : 'Copy Old',
      onClick: () => copyOldHook.copy(oldText, (err) => setError(err)),
      disabled: !oldText.trim(),
      title: 'Copy old text',
      showDividerBefore: true
    },
    {
      icon: copyNewHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyNewHook.copied ? 'Copied!' : 'Copy New',
      onClick: () => copyNewHook.copy(newText, (err) => setError(err)),
      disabled: !newText.trim(),
      title: 'Copy new text',
    },
    {
      icon: copyDiffHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyDiffHook.copied ? 'Copied!' : 'Copy Diff',
      onClick: () => copyDiffHook.copy(diffOutput, (err) => setError(err)),
      disabled: !diffOutput.trim(),
      title: 'Copy diff output',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !oldText.trim() && !newText.trim(),
      title: 'Clear all',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      {diffResult && diffResult.changes > 0 && (
        <div className="diff-summary-bar">
          <div className="diff-summary-item">
            <span className="diff-summary-label">Insertions:</span>
            <span className="diff-summary-value diff-insertion">{diffResult.insertions}</span>
          </div>
          <div className="diff-summary-item">
            <span className="diff-summary-label">Deletions:</span>
            <span className="diff-summary-value diff-deletion">{diffResult.deletions}</span>
          </div>
          <div className="diff-summary-item">
            <span className="diff-summary-label">Changes:</span>
            <span className="diff-summary-value">{diffResult.changes}</span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <div className="diff-input-panel">
            <EditorPanel
              title="Old Text"
              onCopy={() => copyOldHook.copy(oldText, (err) => setError(err))}
              copied={copyOldHook.copied}
            >
              <DropzoneTextarea
                {...oldTextFileUpload}
                value={oldText}
                onChange={(e) => {
                  setOldText(e.target.value)
                  setError('')
                }}
                placeholder="Enter or paste the original text..."
                spellCheck={false}
                dropzoneText="Drag & drop old text file or paste"
                dropzoneHint="Supports .txt files"
                dropzoneActiveText="Drop file here"
              />
            </EditorPanel>
            <EditorPanel
              title="New Text"
              onCopy={() => copyNewHook.copy(newText, (err) => setError(err))}
              copied={copyNewHook.copied}
            >
              <DropzoneTextarea
                {...newTextFileUpload}
                value={newText}
                onChange={(e) => {
                  setNewText(e.target.value)
                  setError('')
                }}
                placeholder="Enter or paste the new text..."
                spellCheck={false}
                dropzoneText="Drag & drop new text file or paste"
                dropzoneHint="Supports .txt files"
                dropzoneActiveText="Drop file here"
              />
            </EditorPanel>
          </div>
        }
        right={
          <EditorPanel
            title="Diff Result"
            onCopy={() => copyDiffHook.copy(diffOutput, (err) => setError(err))}
            copied={copyDiffHook.copied}
          >
            <div className="diff-results">
              {!oldText.trim() && !newText.trim() ? (
                <div className="diff-empty-state">
                  <GitCompare size={48} />
                  <p>Enter old and new text to see the differences</p>
                </div>
              ) : diffResult && diffResult.changes === 0 ? (
                <div className="diff-no-changes">
                  <FileText size={48} />
                  <p>No differences found - texts are identical</p>
                </div>
              ) : (
                <div className="diff-output">
                  {diffResult?.lines.map((line, lineIndex) => (
                    <div
                      key={lineIndex}
                      className={`diff-line diff-line-${line.type}`}
                    >
                      <span className="diff-line-prefix">
                        {line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' '}
                      </span>
                      <span className="diff-line-number">
                        {line.type === 'insert' 
                          ? line.newLineNumber?.toString().padStart(4, ' ') || '    '
                          : line.type === 'delete'
                          ? line.oldLineNumber?.toString().padStart(4, ' ') || '    '
                          : (line.oldLineNumber || line.newLineNumber)?.toString().padStart(4, ' ') || '    '
                        }
                      </span>
                      <span className="diff-line-content">{line.content}</span>
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

export default DiffChecker

