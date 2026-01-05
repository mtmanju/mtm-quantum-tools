/**
 * JSON utility functions for validation, formatting, and parsing
 */

export interface JsonValidationResult {
  isValid: boolean
  error?: string
  parsed?: unknown
}

/**
 * Validates and parses JSON string with enhanced error reporting
 */
export const validateJson = (jsonString: string): JsonValidationResult => {
  // Defensive: Handle null/undefined inputs
  if (jsonString == null) {
    return { isValid: false, error: 'JSON string is null or undefined' }
  }
  
  if (typeof jsonString !== 'string') {
    try {
      jsonString = String(jsonString)
    } catch {
      return { isValid: false, error: 'JSON input cannot be converted to string' }
    }
  }
  
  if (!jsonString.trim()) {
    return { isValid: false, error: 'JSON string is empty' }
  }

  try {
    const parsed = JSON.parse(jsonString)
    return { isValid: true, parsed }
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Invalid JSON'
    
    // Enhance error message with position information if available
    if (error instanceof SyntaxError) {
      // Try to extract line and column from error message
      const match = message.match(/position (\d+)/)
      if (match) {
        const position = parseInt(match[1], 10)
        const lines = jsonString.substring(0, position).split('\n')
        const line = lines.length
        const column = lines[lines.length - 1].length + 1
        message = `${message} (Line ${line}, Column ${column})`
      }
      
      // Provide more helpful error messages for common issues
      if (message.includes('Unexpected token')) {
        message += '. Check for missing commas, quotes, or brackets.'
      } else if (message.includes('Unexpected end')) {
        message += '. JSON appears to be incomplete or truncated.'
      } else if (message.includes('Expected')) {
        message += '. Check syntax around the indicated position.'
      }
    }
    
    return { isValid: false, error: message }
  }
}

/**
 * Formats JSON string with indentation
 */
export const formatJson = (jsonString: string, indent: number = 2): string => {
  const validation = validateJson(jsonString)
  if (!validation.isValid || !validation.parsed) {
    return jsonString
  }

  try {
    return JSON.stringify(validation.parsed, null, indent)
  } catch {
    return jsonString
  }
}

/**
 * Minifies JSON string by removing whitespace
 */
export const minifyJson = (jsonString: string): string => {
  const validation = validateJson(jsonString)
  if (!validation.isValid || !validation.parsed) {
    return jsonString
  }

  try {
    return JSON.stringify(validation.parsed)
  } catch {
    return jsonString
  }
}

/**
 * Escapes JSON string for safe display in HTML
 */
export const escapeJson = (jsonString: string): string => {
  return jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

