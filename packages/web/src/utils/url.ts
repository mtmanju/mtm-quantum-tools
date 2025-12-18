/**
 * URL encoding/decoding utilities
 */

/**
 * Encodes a string to URL-encoded format
 */
export const encodeUrl = (text: string): string => {
  if (!text.trim()) return ''
  try {
    return encodeURIComponent(text)
  } catch {
    return ''
  }
}

/**
 * Decodes a URL-encoded string
 */
export const decodeUrl = (encoded: string): { isValid: boolean; decoded: string; error?: string } => {
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
      decoded: '',
      error: err instanceof Error ? err.message : 'Invalid URL encoding'
    }
  }
}

