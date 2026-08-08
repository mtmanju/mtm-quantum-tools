import { Binary, Check, Copy, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { EmptyState } from '../components/ui/EmptyState'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorPanel } from '../components/ui/EditorPanel'
import { useCopy } from '../hooks/useCopy'
import { useHandoff } from '../hooks/useHandoff'
import {
  convertNumberBase,
  formatBinary,
  formatHex,
  getBaseName,
  performBitwiseOperations,
  type NumberBase
} from '../utils/numberBase'
import './NumberBaseConverter.css'

const NumberBaseConverter = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('number-base-converter', setInput)
  const [fromBase, setFromBase] = useState<NumberBase>('decimal')
  /**
   * Errors raised by user *actions* (copy, upload). Conversion errors are
   * derived below and never stored — writing state during render forces an
   * extra render pass and leaves the message one render behind the value
   * that caused it.
   */
  const [actionError, setActionError] = useState('')

  const copyBinaryHook = useCopy()
  const copyOctalHook = useCopy()
  const copyDecimalHook = useCopy()
  const copyHexHook = useCopy()

  const conversion = useMemo(() => {
    if (!input.trim()) return { value: null, error: '' }

    const result = convertNumberBase(input, fromBase)
    if (!result.isValid) {
      return { value: null, error: result.error || 'Conversion failed' }
    }

    return { value: result.result ?? null, error: '' }
  }, [input, fromBase])

  const conversionResult = conversion.value
  const error = actionError || conversion.error

  const bitwiseOps = useMemo(() => {
    if (!conversionResult) return null
    try {
      const decimal = parseInt(conversionResult.decimal, 10)
      if (isNaN(decimal) || decimal < 0 || decimal > 2147483647) return null
      return performBitwiseOperations(decimal)
    } catch {
      return null
    }
  }, [conversionResult])

  const handleClear = useCallback(() => {
    setInput('')
    setActionError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !input.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  const bases: Array<{ value: NumberBase; label: string }> = [
    { value: 'binary', label: 'Binary (2)' },
    { value: 'octal', label: 'Octal (8)' },
    { value: 'decimal', label: 'Decimal (10)' },
    { value: 'hexadecimal', label: 'Hexadecimal (16)' }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="number-base-container">
        <div className="number-base-input-section">
          <div className="number-base-selector">
            {bases.map((base) => (
              <button
                key={base.value}
                type="button"
                className={`number-base-btn ${fromBase === base.value ? 'active' : ''}`}
                onClick={() => {
                  setFromBase(base.value)
                  setActionError('')
                }}
              >
                {base.label}
              </button>
            ))}
          </div>

          <div className="number-base-input-wrapper">
            <input
              type="text"
              className="number-base-input"
              aria-label="Number to convert"
              placeholder={`Enter ${getBaseName(fromBase).toLowerCase()} number...`}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setActionError('')
              }}
            />
          </div>
        </div>

        {!conversionResult && (
          <EmptyState
            icon={<Binary size={32} strokeWidth={1.5} aria-hidden="true" />}
            title="Your number in every base"
            hint="Enter a value above to see binary, octal, decimal, and hex."
          />
        )}

        {conversionResult && (
          <div className="number-base-results">
            <EditorPanel title="Conversion Results">
              <div className="number-base-result-grid">
                <div className="number-base-result-item">
                  <div className="number-base-result-label">Binary (Base 2)</div>
                  <div className="number-base-result-value">
                    <code>{formatBinary(conversionResult.binary)}</code>
                    <button
                      type="button"
                      className="number-base-copy-btn"
                      onClick={() =>
                        copyBinaryHook.copy(conversionResult.binary, (err) => setActionError(err))
                      }
                      title="Copy binary"
                    >
                      {copyBinaryHook.copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="number-base-result-item">
                  <div className="number-base-result-label">Octal (Base 8)</div>
                  <div className="number-base-result-value">
                    <code>{conversionResult.octal}</code>
                    <button
                      type="button"
                      className="number-base-copy-btn"
                      onClick={() =>
                        copyOctalHook.copy(conversionResult.octal, (err) => setActionError(err))
                      }
                      title="Copy octal"
                    >
                      {copyOctalHook.copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="number-base-result-item">
                  <div className="number-base-result-label">Decimal (Base 10)</div>
                  <div className="number-base-result-value">
                    <code>{conversionResult.decimal}</code>
                    <button
                      type="button"
                      className="number-base-copy-btn"
                      onClick={() =>
                        copyDecimalHook.copy(conversionResult.decimal, (err) => setActionError(err))
                      }
                      title="Copy decimal"
                    >
                      {copyDecimalHook.copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="number-base-result-item">
                  <div className="number-base-result-label">Hexadecimal (Base 16)</div>
                  <div className="number-base-result-value">
                    <code>{formatHex(conversionResult.hexadecimal)}</code>
                    <button
                      type="button"
                      className="number-base-copy-btn"
                      onClick={() =>
                        copyHexHook.copy(conversionResult.hexadecimal, (err) => setActionError(err))
                      }
                      title="Copy hexadecimal"
                    >
                      {copyHexHook.copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </EditorPanel>

            {bitwiseOps && (
              <EditorPanel title="Bitwise Operations">
                <div className="number-base-bitwise-grid">
                  <div className="number-base-bitwise-item">
                    <div className="number-base-bitwise-label">AND (0xFF)</div>
                    <code className="number-base-bitwise-value">{bitwiseOps.and}</code>
                  </div>
                  <div className="number-base-bitwise-item">
                    <div className="number-base-bitwise-label">OR (0xFF)</div>
                    <code className="number-base-bitwise-value">{bitwiseOps.or}</code>
                  </div>
                  <div className="number-base-bitwise-item">
                    <div className="number-base-bitwise-label">XOR (0xFF)</div>
                    <code className="number-base-bitwise-value">{bitwiseOps.xor}</code>
                  </div>
                  <div className="number-base-bitwise-item">
                    <div className="number-base-bitwise-label">NOT (~)</div>
                    <code className="number-base-bitwise-value">{bitwiseOps.not}</code>
                  </div>
                  <div className="number-base-bitwise-item">
                    <div className="number-base-bitwise-label">Left Shift (&lt;&lt; 1)</div>
                    <code className="number-base-bitwise-value">{bitwiseOps.leftShift}</code>
                  </div>
                  <div className="number-base-bitwise-item">
                    <div className="number-base-bitwise-label">Right Shift (&gt;&gt; 1)</div>
                    <code className="number-base-bitwise-value">{bitwiseOps.rightShift}</code>
                  </div>
                </div>
              </EditorPanel>
            )}
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default NumberBaseConverter

