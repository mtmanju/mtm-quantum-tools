import { describe, it, expect } from 'vitest'
import { hexToRgb, isValidHex, parseHsl, calculateContrast } from './color'
import { encodeUrl } from './url'

describe('isValidHex', () => {
  /**
   * CSS Color L4 §5.2 allows exactly 3, 4, 6 or 8 hex digits. `{3,6}` accepted
   * 4- and 5-digit strings that hexToRgb then rejected, and refused the valid
   * 8-digit form with alpha.
   */
  it.each(['#abc', '#abcd', '#abcdef', '#FF00FF80', 'abc', 'ABCDEF'])(
    'accepts %s',
    hex => expect(isValidHex(hex)).toBe(true)
  )

  it.each(['#12345', '#ab', '#a', '#zzz', '#abcdefg', ''])('rejects %s', hex =>
    expect(isValidHex(hex)).toBe(false)
  )

  it('agrees with hexToRgb on every case', () => {
    const samples = [
      '#abc', '#abcd', '#12345', '#abcdef', '#FF00FF80', '#zzz', '#ab',
      'abc', 'FF00FF80', '#ABCDEF12', '#a', '',
    ]
    for (const hex of samples) {
      expect(isValidHex(hex)).toBe(hexToRgb(hex) !== null)
    }
  })
})

describe('hexToRgb', () => {
  it('returns null rather than NaN for a malformed 3-digit value', () => {
    // Previously {r:NaN,g:NaN,b:NaN}, which rgbToHex rendered as #000000 —
    // silently turning bad input into black.
    expect(hexToRgb('#zzz')).toBeNull()
  })

  it.each([
    ['#abc', { r: 170, g: 187, b: 204 }],
    ['#abcdef', { r: 171, g: 205, b: 239 }],
    ['#FF00FF80', { r: 255, g: 0, b: 255 }],
    ['#abcd', { r: 170, g: 187, b: 204 }],
  ])('converts %s', (hex, expected) => {
    expect(hexToRgb(hex)).toEqual(expected)
  })
})

describe('parseHsl', () => {
  it('normalises a negative hue instead of dropping the sign', () => {
    // `(\d+)` could not capture the minus, so -10 was read as 10 — a different
    // colour, returned as though it were the one requested.
    expect(parseHsl('hsl(-10, 50%, 50%)')).toEqual({ h: 350, s: 50, l: 50 })
  })

  it('wraps a hue past 360', () => {
    expect(parseHsl('hsl(370, 50%, 50%)')).toEqual({ h: 10, s: 50, l: 50 })
  })

  it('accepts fractional percentages', () => {
    expect(parseHsl('hsl(120, 50.5%, 50%)')).toEqual({ h: 120, s: 50.5, l: 50 })
  })

  it('still rejects out-of-range saturation and lightness', () => {
    expect(parseHsl('hsl(120, 150%, 50%)')).toBeNull()
    expect(parseHsl('hsl(120, 50%, -5%)')).toBeNull()
  })
})

describe('calculateContrast', () => {
  // WCAG 2.x reference values — unchanged, guarded so the fixes above cannot
  // regress the one part of this file that was already correct.
  it('gives exactly 21:1 for black on white', () => {
    expect(calculateContrast({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 10)
  })

  it('gives the canonical 4.54:1 AA boundary for #767676 on white', () => {
    expect(
      calculateContrast({ r: 255, g: 255, b: 255 }, { r: 118, g: 118, b: 118 })
    ).toBeCloseTo(4.5422, 3)
  })
})

describe('encodeUrl', () => {
  it('encodes whitespace-only input rather than discarding it', () => {
    // `!text.trim()` returned '' for the single most likely smoke test.
    expect(encodeUrl(' ')).toBe('%20')
    expect(encodeUrl('   ')).toBe('%20%20%20')
  })

  it('still returns empty for genuinely empty input', () => {
    expect(encodeUrl('')).toBe('')
  })

  it('preserves surrounding spaces', () => {
    expect(encodeUrl(' a ')).toBe('%20a%20')
  })
})
