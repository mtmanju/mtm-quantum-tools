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
    throw new Error(`Failed to encode to Base64: ${errorMsg}`)
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

    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let base64Data = base64.includes(',') ? base64.split(',')[1] : base64
    
    // Store original length for debugging
    const originalLength = base64Data.length
    
    // Remove all whitespace (spaces, newlines, tabs, etc.)
    base64Data = base64Data.replace(/\s+/g, '')
    
    // Remove any characters that aren't valid Base64 (A-Z, a-z, 0-9, +, /, =)
    // This handles cases where invalid characters might have been introduced
    // We'll be more lenient and just remove invalid chars instead of rejecting
    const validBase64Chars = /[A-Za-z0-9+/=]/g
    const matches = base64Data.match(validBase64Chars)
    
    if (!matches || matches.length === 0) {
      return {
        isValid: false,
        error: 'Invalid Base64 format: no valid Base64 characters found'
      }
    }
    
    // Reconstruct the string with only valid characters
    base64Data = matches.join('')
    
    // Check if empty after cleaning
    if (!base64Data) {
      return {
        isValid: false,
        error: 'Invalid Base64 format: empty after cleaning'
      }
    }
    
    // CRITICAL: Remove any '=' characters that appear in the middle of the string
    // Base64 padding can ONLY appear at the end (0-2 characters)
    // If '=' appears in the middle, it's invalid and must be removed
    const equalsInMiddle = base64Data.match(/=(?!=*$)/g)
    if (equalsInMiddle && equalsInMiddle.length > 0) {
      // Remove all '=' characters that aren't at the end
      const lastEquals = base64Data.match(/=+$/)
      const paddingAtEnd = lastEquals ? lastEquals[0] : ''
      base64Data = base64Data.replace(/=/g, '') + paddingAtEnd
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Removed ${equalsInMiddle.length} invalid '=' characters from middle of Base64 string`)
      }
    }
    
    // Log removed characters for debugging (in development)
    if (process.env.NODE_ENV === 'development' && base64Data.length !== originalLength) {
      const removed = base64.match(/[^A-Za-z0-9+/=\s,]/g)
      if (removed && removed.length > 0) {
        console.log('Removed invalid characters from Base64:', [...new Set(removed)].slice(0, 20).join(', '))
      }
    }
    
    // Validate Base64 format - allow padding characters at the end
    // Base64 can only contain A-Z, a-z, 0-9, +, /, and = for padding
    // After cleaning, this should always pass, but validate anyway
    // Use a more lenient pattern that allows empty string (edge case)
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/
    if (!base64Pattern.test(base64Data)) {
      // This should rarely happen after cleaning, but check for edge cases
      // Find any remaining invalid characters
      const invalidChars = base64Data.match(/[^A-Za-z0-9+/=]/g)
      if (invalidChars && invalidChars.length > 0) {
        const uniqueInvalid = [...new Set(invalidChars)].slice(0, 10) // Limit to first 10 for display
        const charInfo = uniqueInvalid.map(c => {
          const code = c.charCodeAt(0)
          return `'${c}' (U+${code.toString(16).toUpperCase().padStart(4, '0')})`
        }).join(', ')
        return {
          isValid: false,
          error: `Invalid Base64 format: found invalid characters after cleaning: ${charInfo}${invalidChars.length > 10 ? ` (and ${invalidChars.length - 10} more)` : ''}. This may indicate the Base64 string is corrupted.`
        }
      }
      // If pattern doesn't match but no invalid chars found, might be a padding issue
      // Check if it's just a padding problem
      if (base64Data.includes('=') && !/={0,2}$/.test(base64Data)) {
        return {
          isValid: false,
          error: 'Invalid Base64 format: padding characters (=) must only appear at the end (0-2 characters)'
        }
      }
      // Generic fallback - but try to decode anyway if length is valid
      // Sometimes the pattern fails but the Base64 is actually valid
      if (base64Data.length > 0 && base64Data.length % 4 === 0) {
        // Length is valid, try to decode anyway
        // We'll let the atob() call handle the actual validation
      } else {
        return {
          isValid: false,
          error: `Invalid Base64 format: validation failed. String length: ${base64Data.length} (must be multiple of 4). Please ensure the Base64 string is complete and properly formatted.`
        }
      }
    }
    
    // Fix padding - Base64 padding can only be 0, 1, or 2 '=' characters at the end
    // Remove ALL padding first, then recalculate the correct amount based on data length
    let cleanBase64 = base64Data.replace(/=+$/, '')
    const dataLength = cleanBase64.length
    
    // Calculate how much padding is needed to make length a multiple of 4
    const needsPadding = dataLength % 4
    
    // Add the correct amount of padding (0, 1, or 2 characters)
    if (needsPadding > 0) {
      cleanBase64 = cleanBase64 + '='.repeat(4 - needsPadding)
    }
    
    // Final check - ensure length is now a multiple of 4
    if (cleanBase64.length % 4 !== 0) {
      return {
        isValid: false,
        error: `Invalid Base64 format: cannot fix length (${cleanBase64.length} chars is not multiple of 4). The string may be truncated or corrupted.`
      }
    }

    // Try to decode to bytes first to detect file type
    // This is the real validation - if atob() succeeds, the Base64 is valid
    let bytes: Uint8Array
    try {
      // Double-check the string is clean before decoding
      // Sometimes there can be edge cases with very large strings
      const finalCheck = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '')
      if (finalCheck.length !== cleanBase64.length) {
        // Found more invalid chars - use the cleaned version
        cleanBase64 = finalCheck
      }
      
      // Final padding fix - remove ALL padding and recalculate
      cleanBase64 = cleanBase64.replace(/=+$/, '') // Remove all existing padding
      const finalDataLength = cleanBase64.length
      const finalNeedsPadding = finalDataLength % 4
      
      // Add correct padding (0, 1, or 2 characters only)
      if (finalNeedsPadding > 0) {
        cleanBase64 = cleanBase64 + '='.repeat(4 - finalNeedsPadding)
      }
      
      // Ensure we never have more than 2 padding characters
      const finalPaddingMatch = cleanBase64.match(/=+$/)
      if (finalPaddingMatch && finalPaddingMatch[0].length > 2) {
        cleanBase64 = cleanBase64.replace(/=+$/, '')
        const correctedDataLength = cleanBase64.length
        const correctedNeedsPadding = correctedDataLength % 4
        if (correctedNeedsPadding > 0) {
          cleanBase64 = cleanBase64 + '='.repeat(4 - correctedNeedsPadding)
        }
      }
      
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

