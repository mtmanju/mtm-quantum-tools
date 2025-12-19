import { Check, Contrast, Copy, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
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
  const [format, setFormat] = useState<ColorFormat>('hex')
  const [error, setError] = useState('')

  const copyHexHook = useCopy()
  const copyRgbHook = useCopy()
  const copyHslHook = useCopy()

  const colorResult = useMemo(() => {
    if (!input.trim()) return null

    const trimmed = input.trim()

    try {
      if (format === 'hex') {
        if (!isValidHex(trimmed)) {
          setError('Invalid hex color format. Use #RRGGBB or #RGB')
          return null
        }

        const rgb = hexToRgb(trimmed)
        if (!rgb) {
          setError('Failed to convert hex to RGB')
          return null
        }

        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
        const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`

        setError('')
        return {
          hex: hex.toUpperCase(),
          rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          rgbValues: rgb,
          hslValues: hsl
        }
      } else if (format === 'rgb') {
        const rgb = parseRgb(trimmed)
        if (!rgb) {
          setError('Invalid RGB format. Use: r, g, b or rgb(r, g, b)')
          return null
        }

        const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

        setError('')
        return {
          hex,
          rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          rgbValues: rgb,
          hslValues: hsl
        }
      } else if (format === 'hsl') {
        const hsl = parseHsl(trimmed)
        if (!hsl) {
          setError('Invalid HSL format. Use: h, s%, l% or hsl(h, s%, l%)')
          return null
        }

        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
        const hex = hslToHex(hsl.h, hsl.s, hsl.l)

        setError('')
        return {
          hex,
          rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
          hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
          rgbValues: rgb,
          hslValues: hsl
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Color conversion failed')
      return null
    }

    return null
  }, [input, format])

  const handleClear = useCallback(() => {
    setInput('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyHexHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHexHook.copied ? 'Copied!' : 'Copy Hex',
      onClick: () => {
        if (colorResult) {
          copyHexHook.copy(colorResult.hex, (err) => setError(err))
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
                setError('')
              }}
            >
              HEX
            </button>
            <button
              type="button"
              className={`color-format-btn ${format === 'rgb' ? 'active' : ''}`}
              onClick={() => {
                setFormat('rgb')
                setError('')
              }}
            >
              RGB
            </button>
            <button
              type="button"
              className={`color-format-btn ${format === 'hsl' ? 'active' : ''}`}
              onClick={() => {
                setFormat('hsl')
                setError('')
              }}
            >
              HSL
            </button>
          </div>

          <div className="color-input-wrapper">
            <input
              type={format === 'hex' ? 'color' : 'text'}
              className={`color-input ${format === 'hex' ? 'color-input-picker' : ''}`}
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
                setError('')
              }}
            />
            {format === 'hex' && (
              <input
                type="text"
                className="color-input-text"
                placeholder="#FF5733 or FF5733"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setError('')
                }}
              />
            )}
          </div>
        </div>

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
                    onClick={() => copyHexHook.copy(colorResult.hex, (err) => setError(err))}
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
                    onClick={() => copyRgbHook.copy(colorResult.rgb, (err) => setError(err))}
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
                    onClick={() => copyHslHook.copy(colorResult.hsl, (err) => setError(err))}
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

