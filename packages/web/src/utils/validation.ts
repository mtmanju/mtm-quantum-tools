/**
 * Validation utilities for ensuring tool precision and accuracy
 */

/**
 * Validate number precision - checks for floating point errors
 */
export const validateNumberPrecision = (value: number, expectedDecimals: number = 2): boolean => {
  if (isNaN(value) || !isFinite(value)) return false
  
  const rounded = Math.round(value * Math.pow(10, expectedDecimals)) / Math.pow(10, expectedDecimals)
  const diff = Math.abs(value - rounded)
  return diff < Number.EPSILON * 10
}

/**
 * Validate financial calculation result
 */
export const validateFinancialResult = (
  result: number,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): boolean => {
  if (isNaN(result) || !isFinite(result)) return false
  if (result < min || result > max) return false
  return true
}

/**
 * Validate currency amount (2 decimal precision)
 */
export const validateCurrency = (amount: number): boolean => {
  return validateNumberPrecision(amount, 2) && validateFinancialResult(amount)
}

/**
 * Validate percentage (2-4 decimal precision)
 */
export const validatePercentage = (percent: number): boolean => {
  if (isNaN(percent) || !isFinite(percent)) return false
  if (percent < -100 || percent > 10000) return false // Allow up to 10000% for extreme cases
  return validateNumberPrecision(percent, 4)
}

/**
 * Validate timestamp
 */
export const validateTimestamp = (timestamp: number): boolean => {
  if (isNaN(timestamp) || !isFinite(timestamp)) return false
  // Valid timestamp range: Jan 1, 1970 to Jan 1, 2100
  const minTimestamp = 0
  const maxTimestamp = 4102444800000 // Jan 1, 2100 in milliseconds
  return timestamp >= minTimestamp && timestamp <= maxTimestamp
}

/**
 * Validate number base conversion
 */
export const validateNumberBase = (
  value: string,
  base: 2 | 8 | 10 | 16
): boolean => {
  if (!value.trim()) return false
  
  try {
    const decimal = parseInt(value.replace(/\s/g, ''), base)
    return !isNaN(decimal) && isFinite(decimal) && decimal >= 0
  } catch {
    return false
  }
}

/**
 * Validate UUID format
 */
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate email format
 */
export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate JSON string
 */
export const validateJSONString = (json: string): boolean => {
  if (!json.trim()) return false
  try {
    JSON.parse(json)
    return true
  } catch {
    return false
  }
}

/**
 * Validate XML string (basic check)
 */
export const validateXMLString = (xml: string): boolean => {
  if (!xml.trim()) return false
  // Basic check: must have opening and closing tags
  const hasTags = /<[^>]+>/.test(xml)
  const balancedTags = (xml.match(/</g) || []).length === (xml.match(/>/g) || []).length
  return hasTags && balancedTags
}

/**
 * Round to specified decimal places with precision
 */
export const roundToDecimals = (value: number, decimals: number): number => {
  if (isNaN(value) || !isFinite(value)) return 0
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Fix floating point precision issues
 */
export const fixFloatPrecision = (value: number, precision: number = 10): number => {
  if (isNaN(value) || !isFinite(value)) return 0
  if (Math.abs(value) < Number.EPSILON) return 0
  return roundToDecimals(value, precision)
}

