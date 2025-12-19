export interface ColorValue {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleaned = hex.replace('#', '').trim()
  
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16)
    const g = parseInt(cleaned[1] + cleaned[1], 16)
    const b = parseInt(cleaned[2] + cleaned[2], 16)
    return { r, g, b }
  }
  
  if (cleaned.length === 6) {
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
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

export const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360
  s /= 100
  l /= 100
  
  let r = 0
  let g = 0
  let b = 0
  
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
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
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
  const match = hsl.match(/(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/)
  if (!match) return null
  
  const h = parseInt(match[1], 10)
  const s = parseInt(match[2], 10)
  const l = parseInt(match[3], 10)
  
  if (isNaN(h) || isNaN(s) || isNaN(l)) return null
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null
  
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

export const isValidHex = (hex: string): boolean => {
  return /^#?[0-9A-Fa-f]{3,6}$/.test(hex)
}

