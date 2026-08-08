import { Check, Copy, Upload, X, ArrowRightLeft, FileSpreadsheet, FileDown } from 'lucide-react'
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
import { downloadTextFile } from '../utils/file'
import { useHandoff } from '../hooks/useHandoff'
import './CsvToJsonConverter.css'

const CsvToJsonConverter = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('csv-to-json', setInput)
  const [mode, setMode] = useState<'csv-to-json' | 'json-to-csv'>('csv-to-json')
  const [delimiter, setDelimiter] = useState(',')
  const [hasHeaders, setHasHeaders] = useState(true)
  /**
   * Errors raised by user *actions* (copy, upload). Conversion errors are
   * derived below and never stored — writing state during render forces an
   * extra render pass and leaves the message one render behind the value
   * that caused it.
   */
  const [actionError, setActionError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setInput(text)
      setActionError('')
    },
    onError: (err) => setActionError(err),
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt', '.csv']
    }
  })

  const conversion = useMemo(() => {
    if (!input.trim()) return { value: '', error: '' }

    try {
      if (mode === 'csv-to-json') {
        const result = csvToJson(input, { delimiter, hasHeaders })
        if (!result.isValid) {
          return { value: '', error: result.error || 'Failed to convert CSV to JSON' }
        }
        return { value: result.json || '', error: '' }
      } else {
        const result = jsonToCsv(input, { delimiter, hasHeaders })
        if (!result.isValid) {
          return { value: '', error: result.error || 'Failed to convert JSON to CSV' }
        }
        return { value: result.json || '', error: '' }
      }
    } catch (err) {
      return { value: '', error: err instanceof Error ? err.message : 'Conversion failed' }
    }
  }, [input, mode, delimiter, hasHeaders])

  const output = conversion.value
  const error = actionError || conversion.error

  const handleClear = useCallback(() => {
    setInput('')
    setActionError('')
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
      label: copyInputHook.copied ? 'Copied!' : 'Copy input',
      onClick: () => copyInputHook.copy(input, (err) => setActionError(err)),
      disabled: !input.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy output',
      onClick: () => copyOutputHook.copy(output, (err) => setActionError(err)),
      disabled: !output.trim(),
      title: 'Copy output',
    },
    {
      icon: <FileDown size={16} />,
      label: 'Download',
      onClick: () => {
        if (mode === 'csv-to-json') {
          downloadTextFile(output, 'data.json', 'application/json')
        } else {
          downloadTextFile(output, 'data.csv', 'text/csv')
        }
      },
      disabled: !output.trim(),
      title: 'Download output as file',
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

      {/* One row: the examples/mode controls and the options beside them answer the same question, so they no longer cost two bars. */}
      <div className="tool-row-group">
        <div className="csv-json-mode-selector">
          <button
            type="button"
            className={`csv-json-mode-btn ${mode === 'csv-to-json' ? 'active' : ''}`}
            onClick={() => {
              setMode('csv-to-json')
              setActionError('')
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
              setActionError('')
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
      </div>

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <EditorPanel
            title={mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
            onCopy={() => copyInputHook.copy(input, (err) => setActionError(err))}
            copied={copyInputHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setActionError('')
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
            onCopy={() => copyOutputHook.copy(output, (err) => setActionError(err))}
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

