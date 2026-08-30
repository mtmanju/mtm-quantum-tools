/**
 * Base64 encoding and decoding utilities
 */

export interface Base64Result {
  isValid: boolean
  decoded?: string
  decodedBytes?: Uint8Array
  mimeType?: string
  error?: string
  isBinary?: boolean
}

/**
 * Encodes a string to Base64
 */
export const encodeToBase64 = (text: string): string => {
  // Defensive: Handle null/undefined inputs
  if (text == null) text = ''
  if (typeof text !== 'string') text = String(text)
  
  try {
    return btoa(unescape(encodeURIComponent(text)))
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to encode to Base64: ${errorMsg}`, { cause: error })
  }
}

/**
 * Decodes Base64 to string
 */
export const decodeFromBase64 = (base64: string): Base64Result => {
  try {
    if (!base64 || typeof base64 !== 'string') {
      return {
        isValid: false,
        error: 'Invalid Base64 format: empty or invalid input'
      }
    }

    const trimmed = base64.trim()

    /**
     * Strip a data-URL prefix only when it really is one.
     *
     * This used to be `base64.includes(',') ? base64.split(',')[1] : base64`,
     * so a comma anywhere truncated the input to whatever followed it:
     * `Zm9v,YmFy` decoded to "bar" and was reported valid.
     */
    const dataUrl = /^data:[^,]*;base64,/i.exec(trimmed)
    const withoutPrefix = dataUrl ? trimmed.slice(dataUrl[0].length) : trimmed

    // Whitespace is layout, not data: MIME and PEM wrap Base64 at fixed widths.
    const base64Data = withoutPrefix.replace(/\s+/g, '')

    if (!base64Data) {
      return {
        isValid: false,
        error: 'Invalid Base64 format: no data to decode'
      }
    }

    /**
     * Reject characters outside the alphabet; do not delete them.
     *
     * RFC 4648 §3.3 is explicit that a decoder MUST reject data containing
     * characters outside the base alphabet. This previously stripped them and
     * carried on, so `aGVsbG8h!!!` decoded to "hello!" and reported success — a
     * corrupted or partial paste produced plausible output with no indication
     * that anything had been discarded, which is exactly what a decoder exists
     * to catch.
     */
    const invalid = base64Data.match(/[^A-Za-z0-9+/=]/g)
    if (invalid) {
      const unique = [...new Set(invalid)].slice(0, 10)
      const detail = unique
        .map(c => `'${c}' (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`)
        .join(', ')
      return {
        isValid: false,
        error: `Invalid Base64: contains characters outside the Base64 alphabet: ${detail}${invalid.length > 10 ? ` (and ${invalid.length - 10} more)` : ''}`
      }
    }

    /**
     * Padding terminates the data; it cannot appear inside it.
     *
     * `SGVsbG8=world` used to have the interior `=` spliced out and the halves
     * concatenated — reported valid, with no decoded text at all. `Zg==Zg==`,
     * two concatenated encodings of "f", was fused into three garbage bytes.
     */
    if (/=[^=]/.test(base64Data)) {
      return {
        isValid: false,
        error: 'Invalid Base64: padding (=) may only appear at the end of the string'
      }
    }

    const padding = (/=*$/.exec(base64Data)?.[0] ?? '').length
    if (padding > 2) {
      return {
        isValid: false,
        error: 'Invalid Base64: at most two padding characters (=) are allowed'
      }
    }

    const body = base64Data.slice(0, base64Data.length - padding)
    const remainder = body.length % 4

    // A remainder of 1 cannot be produced by any input: 4 output characters
    // encode 3 bytes, so valid lengths leave 0, 2 or 3.
    if (remainder === 1) {
      return {
        isValid: false,
        error: 'Invalid Base64: truncated or corrupted (invalid length)'
      }
    }

    // Unpadded Base64 is common and unambiguous, so the padding is completed
    // rather than rejected. That adds no data and changes no decoded bytes.
    const cleanBase64 = remainder === 0 ? body : body + '='.repeat(4 - remainder)

    // Try to decode to bytes first to detect file type
    // This is the real validation - if atob() succeeds, the Base64 is valid
    let bytes: Uint8Array
    try {
      bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0))
    } catch (decodeError) {
      // If atob fails, the Base64 is invalid
      const errorMsg = decodeError instanceof Error ? decodeError.message : 'Unknown error'
      
      // Provide more helpful debugging info
      let debugInfo = ''
      if (process.env.NODE_ENV === 'development') {
        // Check for common issues
        const hasInvalidChars = cleanBase64.match(/[^A-Za-z0-9+/=]/g)
        const paddingMatch = cleanBase64.match(/=+$/)
        const paddingCount = (paddingMatch && paddingMatch[0].length) || 0
        
        debugInfo = ` Length: ${cleanBase64.length}, Padding at end: ${paddingCount} (should be 0-2)`
        if (hasInvalidChars) {
          debugInfo += `, Invalid chars found: ${hasInvalidChars.length}`
        }
        if (cleanBase64.length % 4 !== 0) {
          debugInfo += `, Length not multiple of 4 (remainder: ${cleanBase64.length % 4})`
        }
      }
      
      return {
        isValid: false,
        error: `Invalid Base64 format: decoding failed. ${errorMsg}.${debugInfo} The string may be corrupted, incomplete, or contain invalid characters. Please try copying the Base64 string again.`
      }
    }
    
    // Detect MIME type from first bytes (file signatures)
    let mimeType: string | undefined
    if (bytes.length >= 4) {
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        mimeType = 'image/png'
      }
      // JPEG: FF D8 FF
      else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        mimeType = 'image/jpeg'
      }
      // GIF: 47 49 46 38
      else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
        mimeType = 'image/gif'
      }
      // PDF: 25 50 44 46
      else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        mimeType = 'application/pdf'
      }
      // ZIP: 50 4B 03 04 or 50 4B 05 06
      else if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
        mimeType = 'application/zip'
      }
      // WebP: Check for RIFF...WEBP
      else if (bytes.length >= 12 && 
               bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
               bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        mimeType = 'image/webp'
      }
      // SVG: Check for <svg or <?xml
      else if (bytes.length >= 5 && 
               ((bytes[0] === 0x3C && bytes[1] === 0x73 && bytes[2] === 0x76 && bytes[3] === 0x67) ||
                (bytes[0] === 0x3C && bytes[1] === 0x3F && bytes[2] === 0x78 && bytes[3] === 0x6D))) {
        mimeType = 'image/svg+xml'
      }
    }

    // If it's a binary file type, don't try to decode as text
    if (mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType === 'application/zip')) {
      return {
        isValid: true,
        decoded: undefined, // Don't decode binary files as text
        decodedBytes: bytes,
        mimeType,
        isBinary: true
      }
    }

    // Try to decode as text for text-based files
    try {
      const decoded = decodeURIComponent(escape(atob(cleanBase64)))
      return {
        isValid: true,
        decoded,
        decodedBytes: bytes,
        mimeType: mimeType || 'text/plain',
        isBinary: false
      }
    } catch {
      // If text decoding fails, it's binary
      return {
        isValid: true,
        decoded: undefined,
        decodedBytes: bytes,
        mimeType: mimeType || 'application/octet-stream',
        isBinary: true
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to decode Base64'
    }
  }
}

/**
 * Converts file to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Converts Base64 to Blob
 */
export const base64ToBlob = (base64: string, mimeType: string = 'application/octet-stream'): Blob => {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
  const cleanBase64 = base64Data.trim().replace(/\s/g, '')
  const byteCharacters = atob(cleanBase64)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Formats Base64 string for display (adds line breaks every 76 characters)
 */
export const formatBase64 = (base64: string, lineLength: number = 76): string => {
  const cleanBase64 = base64.replace(/\s/g, '')
  const lines: string[] = []
  
  for (let i = 0; i < cleanBase64.length; i += lineLength) {
    lines.push(cleanBase64.slice(i, i + lineLength))
  }
  
  return lines.join('\n')
}

/**
 * Minifies Base64 string (removes all whitespace)
 */
export const minifyBase64 = (base64: string): string => {
  return base64.replace(/\s/g, '')
}

/**
 * Cleans Base64 string for use in data URLs (removes invalid chars, fixes padding)
 */
export const cleanBase64ForDataUrl = (base64: string): string => {
  if (!base64 || typeof base64 !== 'string') return ''
  
  // Remove data URL prefix if present
  let clean = base64.includes(',') ? base64.split(',')[1] : base64
  
  // Remove all whitespace
  clean = clean.replace(/\s+/g, '')
  
  // Remove invalid characters (keep only valid Base64 chars)
  clean = clean.replace(/[^A-Za-z0-9+/=]/g, '')
  
  // Remove any '=' in the middle (keep only at end)
  const equalsInMiddle = clean.match(/=(?!=*$)/g)
  if (equalsInMiddle && equalsInMiddle.length > 0) {
    const lastEquals = clean.match(/=+$/)
    const paddingAtEnd = lastEquals ? lastEquals[0] : ''
    clean = clean.replace(/=/g, '') + paddingAtEnd
  }
  
  // Fix padding
  clean = clean.replace(/=+$/, '')
  const needsPadding = clean.length % 4
  if (needsPadding > 0) {
    clean = clean + '='.repeat(4 - needsPadding)
  }
  
  return clean
}

/**
 * Converts decoded bytes back to Base64 for data URLs
 */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

