import { Check, Copy, X, RefreshCw, FileText } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorPanel } from '../components/ui/EditorPanel'
import { useCopy } from '../hooks/useCopy'
import { generateLoremIpsum } from '../utils/lorem'
import './LoremIpsumGenerator.css'

type LoremType = 'words' | 'sentences' | 'paragraphs'
type LoremTextType = 'latin' | 'english'

const LoremIpsumGenerator = () => {
  const [type, setType] = useState<LoremType>('paragraphs')
  const [textType, setTextType] = useState<LoremTextType>('latin')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const handleGenerate = useCallback(() => {
    setError('')
    
    if (count < 1 || count > 1000) {
      setError('Count must be between 1 and 1000')
      return
    }

    try {
      const generated = generateLoremIpsum(type, count, textType)
      setOutput(generated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate text')
    }
  }, [type, count, textType])

  const handleClear = useCallback(() => {
    setOutput('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <RefreshCw size={16} />,
      label: 'Generate',
      onClick: handleGenerate,
      title: 'Generate Lorem Ipsum'
    },
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyHook.copy(output, (err) => setError(err)),
      disabled: !output.trim(),
      title: 'Copy text',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !output.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="lorem-generator-container">
        <div className="lorem-controls">
          <div className="lorem-text-type-selector">
            <button
              type="button"
              className={`lorem-text-type-btn ${textType === 'latin' ? 'active' : ''}`}
              onClick={() => setTextType('latin')}
            >
              Latin
            </button>
            <button
              type="button"
              className={`lorem-text-type-btn ${textType === 'english' ? 'active' : ''}`}
              onClick={() => setTextType('english')}
            >
              English
            </button>
          </div>
          <div className="lorem-type-selector">
            <button
              type="button"
              className={`lorem-type-btn ${type === 'words' ? 'active' : ''}`}
              onClick={() => {
                setType('words')
                setCount(Math.min(count, 1000))
              }}
            >
              Words
            </button>
            <button
              type="button"
              className={`lorem-type-btn ${type === 'sentences' ? 'active' : ''}`}
              onClick={() => {
                setType('sentences')
                setCount(Math.min(count, 100))
              }}
            >
              Sentences
            </button>
            <button
              type="button"
              className={`lorem-type-btn ${type === 'paragraphs' ? 'active' : ''}`}
              onClick={() => {
                setType('paragraphs')
                setCount(Math.min(count, 50))
              }}
            >
              Paragraphs
            </button>
          </div>

          <div className="lorem-count-input">
            <label htmlFor="lorem-count">Count:</label>
            <input
              id="lorem-count"
              type="number"
              min="1"
              max={type === 'words' ? 1000 : type === 'sentences' ? 100 : 50}
              value={count}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                if (!isNaN(value) && value > 0) {
                  const max = type === 'words' ? 1000 : type === 'sentences' ? 100 : 50
                  setCount(Math.min(value, max))
                }
              }}
              className="lorem-count-field"
            />
            <span className="lorem-count-hint">
              Max: {type === 'words' ? '1000' : type === 'sentences' ? '100' : '50'}
            </span>
          </div>
        </div>

        <EditorPanel
          title="Generated Text"
          onCopy={() => copyHook.copy(output, (err) => setError(err))}
          copied={copyHook.copied}
        >
          {!output ? (
            <div className="lorem-empty-state">
              <FileText size={48} />
              <p>Click "Generate" to create Lorem Ipsum text</p>
            </div>
          ) : (
            <div className="lorem-output">
              {type === 'paragraphs' ? (
                output.split('\n\n').map((para, idx) => (
                  <p key={idx} className="lorem-paragraph">
                    {para}
                  </p>
                ))
              ) : (
                <p className="lorem-text">{output}</p>
              )}
            </div>
          )}
        </EditorPanel>
      </div>
    </ToolContainer>
  )
}

export default LoremIpsumGenerator

