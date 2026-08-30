export interface ColorValue {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleaned = hex.replace('#', '').trim()
  
  // The 3-digit branch had no NaN guard, unlike the 6-digit one below, so
  // `#zzz` returned {r:NaN,g:NaN,b:NaN} instead of null — and rgbToHex then
  // turned that into #000000, silently rendering bad input as black.
  if (cleaned.length === 3) {
    if (!/^[0-9A-Fa-f]{3}$/.test(cleaned)) return null
    const r = parseInt(cleaned[0] + cleaned[0], 16)
    const g = parseInt(cleaned[1] + cleaned[1], 16)
    const b = parseInt(cleaned[2] + cleaned[2], 16)
    return { r, g, b }
  }
  
  // 4-digit is 3-digit plus an alpha nibble (CSS Color L4 §5.2); the alpha is
  // dropped rather than the whole colour being rejected.
  if (cleaned.length === 4) {
    if (!/^[0-9A-Fa-f]{4}$/.test(cleaned)) return null
    return {
      r: parseInt(cleaned[0] + cleaned[0], 16),
      g: parseInt(cleaned[1] + cleaned[1], 16),
      b: parseInt(cleaned[2] + cleaned[2], 16),
    }
  }

  // 6-digit, and 8-digit where the trailing pair is alpha.
  if (cleaned.length === 6 || cleaned.length === 8) {
    if (!/^[0-9A-Fa-f]+$/.test(cleaned)) return null
    const r = parseInt(cleaned.substring(0, 2), 16)
    const g = parseInt(cleaned.substring(2, 4), 16)
    const b = parseInt(cleaned.substring(4, 6), 16)

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null
    return { r, g, b }
  }

  return null
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  // Clamp values to valid range
  r = Math.max(0, Math.min(255, Math.round(r)))
  g = Math.max(0, Math.min(255, Math.round(g)))
  b = Math.max(0, Math.min(255, Math.round(b)))
  
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  
  // Round to 1 decimal for precision
  return {
    h: Math.round(h * 3600) / 10,
    s: Math.round(s * 1000) / 10,
    l: Math.round(l * 1000) / 10
  }
}

export const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  // Clamp and normalize values for precision
  h = ((h % 360) + 360) % 360 // Normalize to 0-360
  s = Math.max(0, Math.min(100, s))
  l = Math.max(0, Math.min(100, l))
  
  h /= 360
  s /= 100
  l /= 100
  
  // No initialisers: every branch below assigns all three, so seeding them
  // with 0 only hid that fact from the reader (and from the compiler's own
  // definite-assignment check).
  let r: number
  let g: number
  let b: number


  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  
  // Clamp RGB values to valid range and round precisely
  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b * 255)))
  }
}

export const hslToHex = (h: number, s: number, l: number): string => {
  const rgb = hslToRgb(h, s, l)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export const parseRgb = (rgb: string): { r: number; g: number; b: number } | null => {
  const match = rgb.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!match) return null
  
  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null
  
  return { r, g, b }
}

export const parseHsl = (hsl: string): { h: number; s: number; l: number } | null => {
  /**
   * `(\d+)` could not match a sign or a decimal point, so the minus in
   * `hsl(-10, 50%, 50%)` fell outside the capture and the hue was read as 10 —
   * a different colour, returned as though it were the one asked for. It also
   * rejected `hsl(120, 50.5%, 50%)` outright. CSS Color L4 permits negative and
   * fractional values in both places; a negative hue is normalised mod 360.
   */
  const match = hsl.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)%\s*,\s*(-?\d+(?:\.\d+)?)%/)
  if (!match) return null

  const rawH = parseFloat(match[1])
  const s = parseFloat(match[2])
  const l = parseFloat(match[3])

  if (isNaN(rawH) || isNaN(s) || isNaN(l)) return null
  if (s < 0 || s > 100 || l < 0 || l > 100) return null

  // Hue is an angle: it wraps rather than being out of range.
  const h = ((rawH % 360) + 360) % 360

  return { h, s, l }
}

/**
 * Calculates contrast ratio between two colors (WCAG)
 */
export const calculateContrast = (color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number => {
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(color1.r, color1.g, color1.b)
  const l2 = getLuminance(color2.r, color2.g, color2.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Gets WCAG contrast rating
 */
export const getContrastRating = (contrast: number): { level: string; rating: string; pass: boolean } => {
  if (contrast >= 7) {
    return { level: 'AAA', rating: 'Excellent', pass: true }
  } else if (contrast >= 4.5) {
    return { level: 'AA', rating: 'Good', pass: true }
  } else if (contrast >= 3) {
    return { level: 'AA Large', rating: 'Acceptable (Large text only)', pass: true }
  } else {
    return { level: 'Fail', rating: 'Poor', pass: false }
  }
}

/**
 * CSS Color L4 §5.2 allows exactly 3, 4, 6 or 8 hex digits.
 *
 * `{3,6}` accepted 4- and 5-digit strings that `hexToRgb` then rejected with
 * null — so `#abcd` and `#12345` validated but did not convert — while
 * rejecting `#FF00FF80`, which is a valid 8-digit colour with alpha.
 */
export const isValidHex = (hex: string): boolean => {
  return /^#?(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex.trim())
}

