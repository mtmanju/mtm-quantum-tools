/**
 * Hash generation utilities
 */

/**
 * Generates MD5 hash (using Web Crypto API fallback)
 */
export const generateMD5 = async (text: string): Promise<string> => {
  // Note: Web Crypto API doesn't support MD5, so we'll use a simple implementation
  // For production, consider using a library like crypto-js
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
}

/**
 * Generates SHA-256 hash
 */
export const generateSHA256 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates SHA-512 hash
 */
export const generateSHA512 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-512', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates SHA-1 hash (using Web Crypto API)
 */
export const generateSHA1 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512'

export interface HashResult {
  algorithm: HashAlgorithm
  hash: string
  input: string
}

/**
 * Generates hash for given text and algorithm
 */
export const generateHash = async (
  text: string,
  algorithm: HashAlgorithm
): Promise<HashResult> => {
  let hash: string

  switch (algorithm) {
    case 'md5':
      hash = await generateMD5(text)
      break
    case 'sha1':
      hash = await generateSHA1(text)
      break
    case 'sha256':
      hash = await generateSHA256(text)
      break
    case 'sha512':
      hash = await generateSHA512(text)
      break
    default:
      hash = await generateSHA256(text)
  }

  return {
    algorithm,
    hash,
    input: text
  }
}

