/**
 * JSON utility functions for validation, formatting, and parsing
 */

export interface JsonValidationResult {
  isValid: boolean
  error?: string
  parsed?: unknown
}

/**
 * Validates and parses JSON string
 */
export const validateJson = (jsonString: string): JsonValidationResult => {
  if (!jsonString.trim()) {
    return { isValid: false, error: 'JSON string is empty' }
  }

  try {
    const parsed = JSON.parse(jsonString)
    return { isValid: true, parsed }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON'
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

