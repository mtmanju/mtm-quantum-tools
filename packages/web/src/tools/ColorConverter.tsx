import { Check, Contrast, Copy, Palette, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EmptyState } from '../components/ui/EmptyState'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useHandoff } from '../hooks/useHandoff'
import {
  calculateContrast,
  getContrastRating,
  hexToRgb,
  hslToHex,
  hslToRgb,
  isValidHex,
  parseHsl,
  parseRgb,
  rgbToHex,
  rgbToHsl
} from '../utils/color'
import './ColorConverter.css'

type ColorFormat = 'hex' | 'rgb' | 'hsl'

const ColorConverter = () => {
  const [input, setInput] = useState('')

  // Accept a value handed over by the paste bar.
  useHandoff('color-converter', setInput)
  const [format, setFormat] = useState<ColorFormat>('hex')
  /**
   * Errors raised by user *actions* (copy, upload). Conversion errors are
   * derived below and never stored — writing state during render forces an
   * extra render pass and leaves the message one render behind the value
   * that caused it.
   */
  const [actionError, setActionError] = useState('')

  const copyHexHook = useCopy()
  const copyRgbHook = useCopy()
  const copyHslHook = useCopy()

  const computed = useMemo(() => {
    if (!input.trim()) return { colorResult: null, error: '' }

    const trimmed = input.trim()

    try {
      if (format === 'hex') {
        if (!isValidHex(trimmed)) {
          return { colorResult: null, error: 'Invalid hex color format. Use #RRGGBB or #RGB' }
        }

        const rgb = hexToRgb(trimmed)
        if (!rgb) {
          return { colorResult: null, error: 'Failed to convert hex to RGB' }
        }

        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
        const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`

        return {
          colorResult: {
            hex: hex.toUpperCase(),
            rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            rgbValues: rgb,
            hslValues: hsl
          },
          error: ''
        }
      } else if (format === 'rgb') {
        const rgb = parseRgb(trimmed)
        if (!rgb) {
          return { colorResult: null, error: 'Invalid RGB format. Use: r, g, b or rgb(r, g, b)' }
        }

        const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

        return {
          colorResult: {
            hex,
            rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            rgbValues: rgb,
            hslValues: hsl
          },
          error: ''
        }
      } else if (format === 'hsl') {
        const hsl = parseHsl(trimmed)
        if (!hsl) {
          return { colorResult: null, error: 'Invalid HSL format. Use: h, s%, l% or hsl(h, s%, l%)' }
        }

        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
        const hex = hslToHex(hsl.h, hsl.s, hsl.l)

        return {
          colorResult: {
            hex,
            rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            rgbValues: rgb,
            hslValues: hsl
          },
          error: ''
        }
      }
    } catch (err) {
      return { colorResult: null, error: err instanceof Error ? err.message : 'Color conversion failed' }
    }

    return { colorResult: null, error: '' }
  }, [input, format])

  const colorResult = computed.colorResult
  const error = actionError || computed.error

  const handleClear = useCallback(() => {
    setInput('')
    setActionError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyHexHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHexHook.copied ? 'Copied!' : 'Copy hex',
      onClick: () => {
        if (colorResult) {
          copyHexHook.copy(colorResult.hex, (err) => setActionError(err))
        }
      },
      disabled: !colorResult,
      title: 'Copy hex color',
      showDividerBefore: true
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

      {error && <ErrorBar message={error} />}

      <div className="color-converter-container">
        <div className="color-input-section">
          <div className="color-format-selector">
            <button
              type="button"
              className={`color-format-btn ${format === 'hex' ? 'active' : ''}`}
              onClick={() => {
                setFormat('hex')
                setActionError('')
              }}
            >
              HEX
            </button>
            <button
              type="button"
              className={`color-format-btn ${format === 'rgb' ? 'active' : ''}`}
              onClick={() => {
                setFormat('rgb')
                setActionError('')
              }}
            >
              RGB
            </button>
            <button
              type="button"
              className={`color-format-btn ${format === 'hsl' ? 'active' : ''}`}
              onClick={() => {
                setFormat('hsl')
                setActionError('')
              }}
            >
              HSL
            </button>
          </div>

          <div className="color-input-wrapper">
            <input
              type={format === 'hex' ? 'color' : 'text'}
              className={`color-input ${format === 'hex' ? 'color-input-picker' : ''}`}
              aria-label="Colour value"
              placeholder={
                format === 'hex'
                  ? '#FF5733 or FF5733'
                  : format === 'rgb'
                  ? '255, 87, 51 or rgb(255, 87, 51)'
                  : '0, 65%, 50% or hsl(0, 65%, 50%)'
              }
              value={format === 'hex' && isValidHex(input) ? input.startsWith('#') ? input : `#${input}` : input}
              onChange={(e) => {
                const value = format === 'hex' && e.target.type === 'color' 
                  ? e.target.value 
                  : e.target.value
                setInput(value)
                setActionError('')
              }}
            />
            {format === 'hex' && (
              <input
                type="text"
                className="color-input-text"
                aria-label="Colour value"
                placeholder="#FF5733 or FF5733"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setActionError('')
                }}
              />
            )}
          </div>
        </div>

        {!colorResult && (
          <EmptyState
            icon={<Palette size={32} strokeWidth={1.5} aria-hidden="true" />}
            title="Your colour, in every format"
            hint="Paste a hex, rgb(), or hsl() value above to see the others."
          />
        )}

        {colorResult && (
          <div className="color-preview-section">
            <div
              className="color-preview-box"
              style={{ backgroundColor: colorResult.hex }}
            />

            <div className="color-contrast-checker">
              <div className="color-contrast-item">
                <div className="color-contrast-label">
                  <Contrast size={16} />
                  <span>vs White</span>
                </div>
                <div className="color-contrast-result">
                  {(() => {
                    const white = { r: 255, g: 255, b: 255 }
                    const contrast = calculateContrast(colorResult.rgbValues, white)
                    const rating = getContrastRating(contrast)
                    return (
                      <>
                        <span className={`color-contrast-ratio ${rating.pass ? 'pass' : 'fail'}`}>
                          {contrast.toFixed(2)}:1
                        </span>
                        <span className={`color-contrast-level ${rating.pass ? 'pass' : 'fail'}`}>
                          {rating.level}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="color-contrast-item">
                <div className="color-contrast-label">
                  <Contrast size={16} />
                  <span>vs Black</span>
                </div>
                <div className="color-contrast-result">
                  {(() => {
                    const black = { r: 0, g: 0, b: 0 }
                    const contrast = calculateContrast(colorResult.rgbValues, black)
                    const rating = getContrastRating(contrast)
                    return (
                      <>
                        <span className={`color-contrast-ratio ${rating.pass ? 'pass' : 'fail'}`}>
                          {contrast.toFixed(2)}:1
                        </span>
                        <span className={`color-contrast-level ${rating.pass ? 'pass' : 'fail'}`}>
                          {rating.level}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div className="color-results">
              <div className="color-result-item">
                <div className="color-result-label">HEX</div>
                <div className="color-result-value">
                  <code>{colorResult.hex}</code>
                  <button
                    type="button"
                    className="color-copy-btn"
                    onClick={() => copyHexHook.copy(colorResult.hex, (err) => setActionError(err))}
                    title="Copy hex"
                  >
                    {copyHexHook.copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="color-result-item">
                <div className="color-result-label">RGB</div>
                <div className="color-result-value">
                  <code>{colorResult.rgb}</code>
                  <button
                    type="button"
                    className="color-copy-btn"
                    onClick={() => copyRgbHook.copy(colorResult.rgb, (err) => setActionError(err))}
                    title="Copy RGB"
                  >
                    {copyRgbHook.copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="color-result-item">
                <div className="color-result-label">HSL</div>
                <div className="color-result-value">
                  <code>{colorResult.hsl}</code>
                  <button
                    type="button"
                    className="color-copy-btn"
                    onClick={() => copyHslHook.copy(colorResult.hsl, (err) => setActionError(err))}
                    title="Copy HSL"
                  >
                    {copyHslHook.copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default ColorConverter

