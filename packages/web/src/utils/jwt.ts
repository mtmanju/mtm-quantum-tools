/**
 * JWT utility functions for decoding and validation
 */

export interface JwtPayload {
  [key: string]: unknown
  exp?: number
  iat?: number
  nbf?: number
}

export interface JwtHeader {
  alg: string
  typ: string
  [key: string]: unknown
}

export interface JwtDecodeResult {
  valid: boolean
  header?: JwtHeader
  payload?: JwtPayload
  signature?: string
  error?: string
}

/**
 * Base64 URL decode
 */
const base64UrlDecode = (str: string): string => {
  try {
    // Add padding if needed
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    return ''
  }
}

/**
 * Decodes a JWT token
 */
export const decodeJwt = (token: string): JwtDecodeResult => {
  if (!token || !token.trim()) {
    return { valid: false, error: 'Token is empty' }
  }

  const parts = token.trim().split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWT format. Expected 3 parts separated by dots.' }
  }

  try {
    const [headerPart, payloadPart, signaturePart] = parts

    // Decode header
    const headerJson = base64UrlDecode(headerPart)
    const header = JSON.parse(headerJson) as JwtHeader

    // Decode payload
    const payloadJson = base64UrlDecode(payloadPart)
    const payload = JSON.parse(payloadJson) as JwtPayload

    return {
      valid: true,
      header,
      payload,
      signature: signaturePart
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to decode JWT'
    return { valid: false, error: message }
  }
}

/**
 * Checks if JWT is expired
 * Uses precise timestamp comparison
 */
export const isJwtExpired = (payload: JwtPayload): boolean => {
  if (!payload.exp || typeof payload.exp !== 'number') return false
  // JWT exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()
  return currentTime >= expirationTime
}

/**
 * Gets time until expiration in seconds
 */
export const getTimeUntilExpiration = (payload: JwtPayload): number | null => {
  if (!payload.exp || typeof payload.exp !== 'number') return null
  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()
  const timeRemaining = Math.floor((expirationTime - currentTime) / 1000)
  return timeRemaining > 0 ? timeRemaining : 0
}

/**
 * Formats timestamp for display
 */
export const formatJwtTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString()
}

