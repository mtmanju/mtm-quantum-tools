import { Check, Copy, Download, X, Hash, RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { useCopy } from '../hooks/useCopy'
import { generateUUIDs, type UUIDVersion } from '../utils/uuid'
import './UuidGenerator.css'

const UuidGenerator = () => {
  const [count, setCount] = useState(1)
  const [version, setVersion] = useState<'v4' | 'v1'>('v4')
  const [uuids, setUuids] = useState<string[]>([])
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const handleGenerate = useCallback(() => {
    setError('')
    if (count < 1 || count > 100) {
      setError('Count must be between 1 and 100')
      return
    }
    const generated = generateUUIDs(count, version)
    setUuids(generated)
  }, [count, version])

  const handleClear = useCallback(() => {
    setUuids([])
    setError('')
  }, [])

  const handleCopyAll = useCallback(() => {
    const allUuids = uuids.join('\n')
    copyHook.copy(allUuids, (err) => setError(err))
  }, [uuids, copyHook])

  const handleDownload = useCallback(() => {
    if (uuids.length === 0) return

    const content = uuids.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uuids-${uuids.length}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [uuids])

  const toolbarButtons = [
    {
      icon: <RefreshCw size={16} />,
      label: 'Generate',
      onClick: handleGenerate,
      title: 'Generate UUIDs'
    },
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy All',
      onClick: handleCopyAll,
      disabled: uuids.length === 0,
      title: 'Copy all UUIDs',
      showDividerBefore: true
    },
    {
      icon: <Download size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: uuids.length === 0,
      title: 'Download UUIDs as file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: uuids.length === 0,
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="uuid-controls">
        <div className="uuid-settings">
          <div className="uuid-count-control">
            <label htmlFor="uuid-count">Number of UUIDs:</label>
            <input
              id="uuid-count"
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="uuid-count-input"
            />
          </div>
          <div className="uuid-version-control">
            <label htmlFor="uuid-version">Version:</label>
            <select
              id="uuid-version"
              value={version}
              onChange={(e) => setVersion(e.target.value as UUIDVersion)}
              className="uuid-version-select"
            >
              <option value="v4">v4 (Random)</option>
              <option value="v1">v1 (Time-based)</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="uuid-generate-btn"
          onClick={handleGenerate}
        >
          <RefreshCw size={16} />
          <span>Generate</span>
        </button>
      </div>

      <div className="uuid-results">
        {uuids.length === 0 ? (
          <div className="uuid-empty-state">
            <Hash size={48} />
            <p>Click "Generate" to create UUIDs</p>
          </div>
        ) : (
          <div className="uuid-list">
            {uuids.map((uuid, index) => (
              <div key={index} className="uuid-item">
                <code className="uuid-value">{uuid}</code>
                <button
                  type="button"
                  className="uuid-copy-btn"
                  onClick={() => copyHook.copy(uuid, (err) => setError(err))}
                  title="Copy UUID"
                >
                  {copyHook.copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default UuidGenerator

