import { Check, Copy, RotateCcw, Shield } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { useCopy } from '../hooks/useCopy'
import { useHandoff } from '../hooks/useHandoff'
import './ChmodCalculator.css'

type PermBits = {
  // Special
  setuid: boolean
  setgid: boolean
  sticky: boolean
  // Owner
  ownerRead: boolean
  ownerWrite: boolean
  ownerExecute: boolean
  // Group
  groupRead: boolean
  groupWrite: boolean
  groupExecute: boolean
  // Other
  otherRead: boolean
  otherWrite: boolean
  otherExecute: boolean
}

const DEFAULT_BITS: PermBits = {
  setuid: false,
  setgid: false,
  sticky: false,
  ownerRead: true,
  ownerWrite: true,
  ownerExecute: false,
  groupRead: true,
  groupWrite: false,
  groupExecute: false,
  otherRead: true,
  otherWrite: false,
  otherExecute: false,
}

function bitsToOctal(bits: PermBits): string {
  const special =
    (bits.setuid ? 4 : 0) + (bits.setgid ? 2 : 0) + (bits.sticky ? 1 : 0)
  const owner =
    (bits.ownerRead ? 4 : 0) +
    (bits.ownerWrite ? 2 : 0) +
    (bits.ownerExecute ? 1 : 0)
  const group =
    (bits.groupRead ? 4 : 0) +
    (bits.groupWrite ? 2 : 0) +
    (bits.groupExecute ? 1 : 0)
  const other =
    (bits.otherRead ? 4 : 0) +
    (bits.otherWrite ? 2 : 0) +
    (bits.otherExecute ? 1 : 0)
  return special > 0
    ? `${special}${owner}${group}${other}`
    : `${owner}${group}${other}`
}

function bitsToSymbolic(bits: PermBits): string {
  const r = (b: boolean) => (b ? 'r' : '-')
  const w = (b: boolean) => (b ? 'w' : '-')
  const x = (execute: boolean, special: boolean, char: string) =>
    special
      ? execute
        ? char
        : char.toUpperCase()
      : execute
        ? 'x'
        : '-'

  return [
    r(bits.ownerRead),
    w(bits.ownerWrite),
    x(bits.ownerExecute, bits.setuid, 's'),
    r(bits.groupRead),
    w(bits.groupWrite),
    x(bits.groupExecute, bits.setgid, 's'),
    r(bits.otherRead),
    w(bits.otherWrite),
    x(bits.otherExecute, bits.sticky, 't'),
  ].join('')
}

function octalToBits(octal: string): PermBits | null {
  const cleaned = octal.replace(/[^0-7]/g, '')
  if (cleaned.length < 3 || cleaned.length > 4) return null

  const digits = cleaned.length === 4 ? cleaned : '0' + cleaned
  const [sp, ow, gr, ot] = digits.split('').map(Number)

  return {
    setuid: (sp & 4) > 0,
    setgid: (sp & 2) > 0,
    sticky: (sp & 1) > 0,
    ownerRead: (ow & 4) > 0,
    ownerWrite: (ow & 2) > 0,
    ownerExecute: (ow & 1) > 0,
    groupRead: (gr & 4) > 0,
    groupWrite: (gr & 2) > 0,
    groupExecute: (gr & 1) > 0,
    otherRead: (ot & 4) > 0,
    otherWrite: (ot & 2) > 0,
    otherExecute: (ot & 1) > 0,
  }
}

const PRESETS = [
  { octal: '644', label: '644', desc: 'File (rw-r--r--)' },
  { octal: '755', label: '755', desc: 'Dir/Exec (rwxr-xr-x)' },
  { octal: '700', label: '700', desc: 'Private (rwx------)' },
  { octal: '600', label: '600', desc: 'Private file (rw-------)' },
  { octal: '777', label: '777', desc: 'All (rwxrwxrwx)' },
  { octal: '664', label: '664', desc: 'Group write (rw-rw-r--)' },
  { octal: '775', label: '775', desc: 'Group exec (rwxrwxr-x)' },
  { octal: '400', label: '400', desc: 'Read-only (r--------)' },
]

const ChmodCalculator = () => {
  const [bits, setBits] = useState<PermBits>(DEFAULT_BITS)
  const [octalInput, setOctalInput] = useState('644')

  // Accept a value handed over by the paste bar.
  useHandoff('chmod-calculator', setOctalInput)
  const [octalError, setOctalError] = useState('')
  const [error, setError] = useState('')

  const copyOctalHook = useCopy()
  const copySymbolicHook = useCopy()
  const copyCommandHook = useCopy()

  const octal = bitsToOctal(bits)
  const symbolic = bitsToSymbolic(bits)
  const chmodCommand = `chmod ${octal} filename`

  const handleBitChange = useCallback(
    (key: keyof PermBits, value: boolean) => {
      setBits((prev) => {
        const next = { ...prev, [key]: value }
        setOctalInput(bitsToOctal(next))
        setOctalError('')
        return next
      })
    },
    []
  )

  const handleOctalInput = useCallback(
    (raw: string) => {
      setOctalInput(raw)
      setOctalError('')
      if (!raw) return
      const parsed = octalToBits(raw)
      if (parsed) {
        setBits(parsed)
        setOctalError('')
      } else if (raw.replace(/[^0-7]/g, '').length > 0) {
        setOctalError('Enter a valid 3- or 4-digit octal number (digits 0-7)')
      }
    },
    []
  )

  const handlePreset = useCallback((octalValue: string) => {
    const parsed = octalToBits(octalValue)
    if (parsed) {
      setBits(parsed)
      setOctalInput(octalValue)
      setOctalError('')
    }
  }, [])

  const handleClear = useCallback(() => {
    setBits(DEFAULT_BITS)
    setOctalInput('644')
    setOctalError('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyCommandHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyCommandHook.copied ? 'Copied!' : 'Copy command',
      onClick: () => copyCommandHook.copy(chmodCommand, (err) => setError(err)),
      title: 'Copy chmod command',
    },
    {
      icon: <RotateCcw size={16} />,
      label: 'Clear',
      onClick: handleClear,
      title: 'Clear',
      showDividerBefore: true,
    },
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      {/* Results row */}
      <div className="chmod-results">
        <div className="chmod-result-item">
          <span className="chmod-result-label">Octal</span>
          <div className="chmod-result-input-wrap">
            <input
              type="text"
              className={`chmod-result-value chmod-octal-input${octalError ? ' chmod-octal-input--error' : ''}`}
              value={octalInput}
              onChange={(e) => handleOctalInput(e.target.value)}
              maxLength={4}
              spellCheck={false}
              aria-label="Octal permission value"
              title="Type a 3- or 4-digit octal value to update checkboxes"
            />
            <button
              type="button"
              className="chmod-copy-btn"
              onClick={() => copyOctalHook.copy(octal, (err) => setError(err))}
              title="Copy octal"
            >
              {copyOctalHook.copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          {octalError && (
            <span className="chmod-octal-error">{octalError}</span>
          )}
        </div>

        <div className="chmod-result-item">
          <span className="chmod-result-label">Symbolic</span>
          <div className="chmod-result-input-wrap">
            <code className="chmod-result-value chmod-symbolic">{symbolic}</code>
            <button
              type="button"
              className="chmod-copy-btn"
              onClick={() =>
                copySymbolicHook.copy(symbolic, (err) => setError(err))
              }
              title="Copy symbolic notation"
            >
              {copySymbolicHook.copied ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>

        <div className="chmod-result-item chmod-result-item--wide">
          <span className="chmod-result-label">chmod command</span>
          <div className="chmod-result-input-wrap">
            <code className="chmod-result-value chmod-command">{chmodCommand}</code>
            <button
              type="button"
              className="chmod-copy-btn"
              onClick={() =>
                copyCommandHook.copy(chmodCommand, (err) => setError(err))
              }
              title="Copy chmod command"
            >
              {copyCommandHook.copied ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="chmod-section-title">
        <Shield size={14} />
        Common presets
      </div>
      <div className="chmod-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.octal}
            type="button"
            className={`chmod-preset-chip${octal === preset.octal ? ' chmod-preset-chip--active' : ''}`}
            onClick={() => handlePreset(preset.octal)}
            title={preset.desc}
          >
            <span className="chmod-preset-chip-label">{preset.label}</span>
            <span className="chmod-preset-chip-desc">{preset.desc}</span>
          </button>
        ))}
      </div>

      {/* Permission grid */}
      <div className="chmod-grid-wrapper">
        <div className="chmod-grid">
          {/* Column headers */}
          <div className="chmod-grid-corner" />
          <div
            className="chmod-grid-header"
            title="Read permission (value 4): allows viewing file contents"
          >
            r
          </div>
          <div
            className="chmod-grid-header"
            title="Write permission (value 2): allows modifying file contents"
          >
            w
          </div>
          <div
            className="chmod-grid-header"
            title="Execute permission (value 1): allows running file or entering directory"
          >
            x
          </div>

          {/* Owner row */}
          <div className="chmod-grid-row-label">
            <span className="chmod-row-title">Owner</span>
            <span className="chmod-row-sub">u</span>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.ownerRead}
                onChange={(e) => handleBitChange('ownerRead', e.target.checked)}
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.ownerWrite}
                onChange={(e) =>
                  handleBitChange('ownerWrite', e.target.checked)
                }
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.ownerExecute}
                onChange={(e) =>
                  handleBitChange('ownerExecute', e.target.checked)
                }
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>

          {/* Group row */}
          <div className="chmod-grid-row-label">
            <span className="chmod-row-title">Group</span>
            <span className="chmod-row-sub">g</span>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.groupRead}
                onChange={(e) => handleBitChange('groupRead', e.target.checked)}
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.groupWrite}
                onChange={(e) =>
                  handleBitChange('groupWrite', e.target.checked)
                }
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.groupExecute}
                onChange={(e) =>
                  handleBitChange('groupExecute', e.target.checked)
                }
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>

          {/* Other row */}
          <div className="chmod-grid-row-label">
            <span className="chmod-row-title">Other</span>
            <span className="chmod-row-sub">o</span>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.otherRead}
                onChange={(e) => handleBitChange('otherRead', e.target.checked)}
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.otherWrite}
                onChange={(e) =>
                  handleBitChange('otherWrite', e.target.checked)
                }
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
          <div className="chmod-grid-cell">
            <label className="chmod-checkbox-label">
              <input
                type="checkbox"
                checked={bits.otherExecute}
                onChange={(e) =>
                  handleBitChange('otherExecute', e.target.checked)
                }
              />
              <span className="chmod-checkbox-custom" />
            </label>
          </div>
        </div>

        {/* Special bits */}
        <div className="chmod-special-row">
          <div className="chmod-section-title chmod-section-title--inline">
            Special bits
          </div>
          <div className="chmod-special-bits">
            <label
              className="chmod-special-bit-item"
              title="Setuid (4000): runs file with owner's privileges. Shown as 's' on owner execute."
            >
              <span className="chmod-special-bit-name">Setuid</span>
              <span className="chmod-special-bit-symbol">s</span>
              <div className="chmod-special-checkbox-wrap">
                <input
                  type="checkbox"
                  checked={bits.setuid}
                  onChange={(e) =>
                    handleBitChange('setuid', e.target.checked)
                  }
                />
                <span className="chmod-checkbox-custom" />
              </div>
            </label>

            <label
              className="chmod-special-bit-item"
              title="Setgid (2000): runs file with group's privileges; on directories, new files inherit group. Shown as 's' on group execute."
            >
              <span className="chmod-special-bit-name">Setgid</span>
              <span className="chmod-special-bit-symbol">s</span>
              <div className="chmod-special-checkbox-wrap">
                <input
                  type="checkbox"
                  checked={bits.setgid}
                  onChange={(e) =>
                    handleBitChange('setgid', e.target.checked)
                  }
                />
                <span className="chmod-checkbox-custom" />
              </div>
            </label>

            <label
              className="chmod-special-bit-item"
              title="Sticky bit (1000): on directories, only file owner can delete/rename. Shown as 't' on other execute."
            >
              <span className="chmod-special-bit-name">Sticky</span>
              <span className="chmod-special-bit-symbol">t</span>
              <div className="chmod-special-checkbox-wrap">
                <input
                  type="checkbox"
                  checked={bits.sticky}
                  onChange={(e) =>
                    handleBitChange('sticky', e.target.checked)
                  }
                />
                <span className="chmod-checkbox-custom" />
              </div>
            </label>
          </div>
        </div>
      </div>
    </ToolContainer>
  )
}

export default ChmodCalculator
