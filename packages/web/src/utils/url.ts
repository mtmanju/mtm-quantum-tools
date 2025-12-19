/**
 * URL encoding/decoding utilities
 */

/**
 * Encodes a string to URL-encoded format
 */
export const encodeUrl = (text: string): string => {
  // Defensive: Handle null/undefined inputs
  if (text == null) return ''
  if (typeof text !== 'string') {
    try {
      text = String(text)
    } catch {
      return ''
    }
  }
  
  if (!text.trim()) return ''
  
  try {
    return encodeURIComponent(text)
  } catch (error) {
    // If encoding fails, return empty string
    return ''
  }
}

/**
 * Decodes a URL-encoded string
 */
export const decodeUrl = (encoded: string): { isValid: boolean; decoded: string; error?: string } => {
  // Defensive: Handle null/undefined inputs
  if (encoded == null) {
    return {
      isValid: false,
      decoded: '',
      error: 'URL-encoded text is null or undefined'
    }
  }
  
  if (typeof encoded !== 'string') {
    try {
      encoded = String(encoded)
    } catch {
      return {
        isValid: false,
        decoded: '',
        error: 'URL-encoded text cannot be converted to string'
      }
    }
  }
  
  if (!encoded.trim()) {
    return {
      isValid: false,
      decoded: '',
      error: 'Please enter URL-encoded text'
    }
  }

  try {
    const decoded = decodeURIComponent(encoded)
    return {
      isValid: true,
      decoded
    }
  } catch (err) {
    return {
      isValid: false,
      decoded: encoded, // Return original on error
      error: err instanceof Error ? err.message : 'Invalid URL encoding'
    }
  }
}

