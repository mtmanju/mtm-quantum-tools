import { Check, Copy, Upload, X, ArrowRightLeft, FileSpreadsheet } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { csvToJson, jsonToCsv } from '../utils/csv'
import './CsvToJsonConverter.css'

const CsvToJsonConverter = () => {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'csv-to-json' | 'json-to-csv'>('csv-to-json')
  const [delimiter, setDelimiter] = useState(',')
  const [hasHeaders, setHasHeaders] = useState(true)
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
      'text/csv': ['.csv'],
      'text/plain': ['.txt', '.csv']
    }
  })

  const output = useMemo(() => {
    if (!input.trim()) return ''

    try {
      if (mode === 'csv-to-json') {
        const result = csvToJson(input, { delimiter, hasHeaders })
        if (!result.isValid) {
          setError(result.error || 'Failed to convert CSV to JSON')
          return ''
        }
        setError('')
        return result.json || ''
      } else {
        const result = jsonToCsv(input, { delimiter, hasHeaders })
        if (!result.isValid) {
          setError(result.error || 'Failed to convert JSON to CSV')
          return ''
        }
        setError('')
        return result.json || ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      return ''
    }
  }, [input, mode, delimiter, hasHeaders])

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

      <div className="csv-json-mode-selector">
        <button
          type="button"
          className={`csv-json-mode-btn ${mode === 'csv-to-json' ? 'active' : ''}`}
          onClick={() => {
            setMode('csv-to-json')
            setError('')
          }}
        >
          <FileSpreadsheet size={16} />
          <span>CSV to JSON</span>
        </button>
        <button
          type="button"
          className={`csv-json-mode-btn ${mode === 'json-to-csv' ? 'active' : ''}`}
          onClick={() => {
            setMode('json-to-csv')
            setError('')
          }}
        >
          <ArrowRightLeft size={16} />
          <span>JSON to CSV</span>
        </button>
      </div>

      <div className="csv-json-options">
        <div className="csv-json-option">
          <label htmlFor="csv-delimiter">Delimiter:</label>
          <input
            id="csv-delimiter"
            type="text"
            value={delimiter}
            onChange={(e) => {
              const val = e.target.value
              if (val.length <= 1) {
                setDelimiter(val || ',')
              }
            }}
            className="csv-delimiter-input"
            maxLength={1}
          />
        </div>
        <div className="csv-json-option">
          <label>
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
            />
            <span>Has Headers</span>
          </label>
        </div>
      </div>

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
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
              placeholder={
                mode === 'csv-to-json'
                  ? 'Paste CSV data here...'
                  : 'Paste JSON array here...'
              }
              spellCheck={false}
              dropzoneText="Drag & drop file or paste"
              dropzoneHint={mode === 'csv-to-json' ? 'Supports .csv files' : 'Supports .json files'}
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title={mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
            onCopy={() => copyOutputHook.copy(output, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            {!input.trim() ? (
              <div className="csv-json-empty-state">
                <FileSpreadsheet size={48} />
                <p>
                  {mode === 'csv-to-json'
                    ? 'Enter CSV data to convert to JSON'
                    : 'Enter JSON array to convert to CSV'}
                </p>
              </div>
            ) : (
              <pre className="csv-json-output">{output}</pre>
            )}
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default CsvToJsonConverter

