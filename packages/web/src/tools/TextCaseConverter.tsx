import { Check, Copy, Upload, X, Type } from 'lucide-react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { convertCase, type CaseType } from '../utils/textCase'
import { useHandoff } from '../hooks/useHandoff'
import './TextCaseConverter.css'

/**
 * How much of each variation is put on screen.
 *
 * The panel is a nine-way preview, not nine full documents. Converting 900 KB
 * costs ~72 ms, but the nine results come to ~7.7 MB of text, and rendering all
 * of it into nine <code> blocks on every keystroke is what actually stalled the
 * tab. Copy still copies the whole value — only the preview is clipped.
 */
const PREVIEW_CHARS = 2000

const TextCaseConverter = () => {
  const [input, setInput] = useState('')
  /**
   * Derived output follows typing rather than blocking it.
   *
   * `input` is a discrete event, so React computes its consequences
   * synchronously before the browser can paint the character. Deferring the
   * derived work lets the keystroke commit on its own and the results catch
   * up at a lower priority. The textarea keeps the urgent value, so the
   * caret never lags or jumps.
   */
  const deferredInput = useDeferredValue(input)

  // Accept a value handed over by the paste bar.
  useHandoff('text-case-converter', setInput)
  const [caseType, setCaseType] = useState<CaseType>('lowercase')
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
      'text/plain': ['.txt']
    }
  })

  const output = useMemo(() => {
    if (!deferredInput.trim()) return ''
    return convertCase(deferredInput, caseType)
  }, [deferredInput, caseType])

  const allCases = useMemo(() => {
    if (!deferredInput.trim()) return null
    const types: Array<{ type: CaseType; label: string }> = [
      { type: 'lowercase', label: 'lowercase' },
      { type: 'uppercase', label: 'UPPERCASE' },
      { type: 'title', label: 'Title Case' },
      { type: 'sentence', label: 'Sentence case' },
      { type: 'camel', label: 'camelCase' },
      { type: 'pascal', label: 'PascalCase' },
      { type: 'snake', label: 'snake_case' },
      { type: 'kebab', label: 'kebab-case' },
      { type: 'constant', label: 'CONSTANT_CASE' },
    ]
    return types.map(({ type, label }) => {
      const value = convertCase(deferredInput, type)
      return {
        type,
        label,
        value,
        // Rendered separately from `value`, which Copy still uses in full.
        preview: value.length > PREVIEW_CHARS ? value.slice(0, PREVIEW_CHARS) : value,
        clipped: value.length > PREVIEW_CHARS,
        length: value.length,
      }
    })
  }, [deferredInput])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
  }, [])

  const caseTypes: Array<{ value: CaseType; label: string }> = [
    { value: 'lowercase', label: 'lowercase' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'title', label: 'Title Case' },
    { value: 'sentence', label: 'Sentence case' },
    { value: 'camel', label: 'camelCase' },
    { value: 'pascal', label: 'PascalCase' },
    { value: 'snake', label: 'snake_case' },
    { value: 'kebab', label: 'kebab-case' },
    { value: 'constant', label: 'CONSTANT_CASE' }
  ]

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload file'
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
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy output',
      onClick: () => copyOutputHook.copy(output, (err) => setError(err)),
      disabled: !output.trim(),
      title: 'Copy output',
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

      <div className="text-case-selector">
        {caseTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`text-case-btn ${caseType === type.value ? 'active' : ''}`}
            onClick={() => setCaseType(type.value)}
            title={type.label}
          >
            {type.label}
          </button>
        ))}
      </div>

      {error && <ErrorBar message={error} />}

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
              placeholder="Enter text to convert..."
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint="Supports .txt files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <div className="text-case-output-panels">
            <EditorPanel
              title={`${caseTypes.find(c => c.value === caseType)?.label || 'Converted'} Text`}
              onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
              copied={copyOutputHook.copied}
            >
              <div className="text-case-output">
                {!input.trim() ? (
                  <div className="text-case-empty-state">
                    <Type size={48} />
                    <p>Enter text to convert case</p>
                  </div>
                ) : (
                  <pre className="text-case-result">{output}</pre>
                )}
              </div>
            </EditorPanel>
            
            {allCases && (
              <EditorPanel title="All Case Variations">
                <div className="text-case-all-variations">
                  {allCases.map((caseItem) => (
                    <div key={caseItem.type} className="text-case-variation-item">
                      <div className="text-case-variation-label">{caseItem.label}:</div>
                      <code className="text-case-variation-value">
                        {caseItem.preview}
                        {caseItem.clipped && (
                          <span className="text-case-variation-clipped">
                            {` … showing first ${PREVIEW_CHARS.toLocaleString()} of ${caseItem.length.toLocaleString()} characters — Copy takes all of it`}
                          </span>
                        )}
                      </code>
                      <button
                        type="button"
                        className="text-case-variation-copy"
                        onClick={() => copyOutputHook.copy(caseItem.value, (err) => setError(err))}
                        title={`Copy ${caseItem.label}`}
                      >
                        {copyOutputHook.copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </EditorPanel>
            )}
          </div>
        }
      />
    </ToolContainer>
  )
}

export default TextCaseConverter

