/**
 * Hash generation utilities
 */

/**
 * MD5 implementation - RFC 1321 compliant
 * Web Crypto API doesn't support MD5, so we implement it directly
 */
const md5 = (text: string): string => {
  // MD5 padding and processing functions
  const leftRotate = (value: number, amount: number): number => {
    return ((value << amount) | (value >>> (32 - amount))) >>> 0
  }

  const addUnsigned = (x: number, y: number): number => {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return ((msw << 16) | (lsw & 0xFFFF)) >>> 0
  }

  const F = (x: number, y: number, z: number): number => (x & y) | (~x & z)
  const G = (x: number, y: number, z: number): number => (x & z) | (y & ~z)
  const H = (x: number, y: number, z: number): number => x ^ y ^ z
  const I = (x: number, y: number, z: number): number => y ^ (x | ~z)

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
    return addUnsigned(leftRotate(a, s), b)
  }

  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
    return addUnsigned(leftRotate(a, s), b)
  }

  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
    return addUnsigned(leftRotate(a, s), b)
  }

  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number => {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
    return addUnsigned(leftRotate(a, s), b)
  }

  const convertToWordArray = (str: string): number[] => {
    // Calculate required array size (16 words per 512-bit block, plus padding)
    const strLen = str.length
    const nWords = (((strLen + 8) >>> 6) + 1) << 4
    const wordArray: number[] = new Array(nWords).fill(0)
    
    for (let i = 0; i < strLen; i++) {
      const bytePos = i >> 2
      const byteOrder = i % 4
      wordArray[bytePos] |= (str.charCodeAt(i) & 0xFF) << (byteOrder * 8)
    }
    
    return wordArray
  }

  const wordToHex = (lValue: number): string => {
    let wordToHexValue = ''
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255
      wordToHexValue = wordToHexValue + lByte.toString(16).padStart(2, '0')
    }
    return wordToHexValue
  }

  // Convert string to UTF-8 bytes
  const utf8Encode = (str: string): string => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    return String.fromCharCode(...bytes)
  }

  const utf8Str = utf8Encode(text)
  const x = convertToWordArray(utf8Str)
  let a = 0x67452301
  let b = 0xEFCDAB89
  let c = 0x98BADCFE
  let d = 0x10325476

  const originalLength = utf8Str.length * 8
  const byteIndex = utf8Str.length
  const wordIndex = byteIndex >> 2
  const bytePos = byteIndex % 4
  
  // Add padding bit
  x[wordIndex] |= 0x80 << (bytePos * 8)
  
  // Add length in bits at the end
  const lengthIndex = (((originalLength + 64) >>> 9) << 4) + 14
  x[lengthIndex] = originalLength & 0xFFFFFFFF
  x[lengthIndex + 1] = (originalLength >>> 32) & 0xFFFFFFFF

  for (let i = 0; i < x.length; i += 16) {
    const oldA = a
    const oldB = b
    const oldC = c
    const oldD = d

    a = FF(a, b, c, d, x[i + 0], 7, 0xD76AA478)
    d = FF(d, a, b, c, x[i + 1], 12, 0xE8C7B756)
    c = FF(c, d, a, b, x[i + 2], 17, 0x242070DB)
    b = FF(b, c, d, a, x[i + 3], 22, 0xC1BDCEEE)
    a = FF(a, b, c, d, x[i + 4], 7, 0xF57C0FAF)
    d = FF(d, a, b, c, x[i + 5], 12, 0x4787C62A)
    c = FF(c, d, a, b, x[i + 6], 17, 0xA8304613)
    b = FF(b, c, d, a, x[i + 7], 22, 0xFD469501)
    a = FF(a, b, c, d, x[i + 8], 7, 0x698098D8)
    d = FF(d, a, b, c, x[i + 9], 12, 0x8B44F7AF)
    c = FF(c, d, a, b, x[i + 10], 17, 0xFFFF5BB1)
    b = FF(b, c, d, a, x[i + 11], 22, 0x895CD7BE)
    a = FF(a, b, c, d, x[i + 12], 7, 0x6B901122)
    d = FF(d, a, b, c, x[i + 13], 12, 0xFD987193)
    c = FF(c, d, a, b, x[i + 14], 17, 0xA679438E)
    b = FF(b, c, d, a, x[i + 15], 22, 0x49B40821)

    a = GG(a, b, c, d, x[i + 1], 5, 0xF61E2562)
    d = GG(d, a, b, c, x[i + 6], 9, 0xC040B340)
    c = GG(c, d, a, b, x[i + 11], 14, 0x265E5A51)
    b = GG(b, c, d, a, x[i + 0], 20, 0xE9B6C7AA)
    a = GG(a, b, c, d, x[i + 5], 5, 0xD62F105D)
    d = GG(d, a, b, c, x[i + 10], 9, 0x2441453)
    c = GG(c, d, a, b, x[i + 15], 14, 0xD8A1E681)
    b = GG(b, c, d, a, x[i + 4], 20, 0xE7D3FBC8)
    a = GG(a, b, c, d, x[i + 9], 5, 0x21E1CDE6)
    d = GG(d, a, b, c, x[i + 14], 9, 0xC33707D6)
    c = GG(c, d, a, b, x[i + 3], 14, 0xF4D50D87)
    b = GG(b, c, d, a, x[i + 8], 20, 0x455A14ED)
    a = GG(a, b, c, d, x[i + 13], 5, 0xA9E3E905)
    d = GG(d, a, b, c, x[i + 2], 9, 0xFCEFA3F8)
    c = GG(c, d, a, b, x[i + 7], 14, 0x676F02D9)
    b = GG(b, c, d, a, x[i + 12], 20, 0x8D2A4C8A)

    a = HH(a, b, c, d, x[i + 5], 4, 0xFFFA3942)
    d = HH(d, a, b, c, x[i + 8], 11, 0x8771F681)
    c = HH(c, d, a, b, x[i + 11], 16, 0x6D9D6122)
    b = HH(b, c, d, a, x[i + 14], 23, 0xFDE5380C)
    a = HH(a, b, c, d, x[i + 1], 4, 0xA4BEEA44)
    d = HH(d, a, b, c, x[i + 4], 11, 0x4BDECFA9)
    c = HH(c, d, a, b, x[i + 7], 16, 0xF6BB4B60)
    b = HH(b, c, d, a, x[i + 10], 23, 0xBEBFBC70)
    a = HH(a, b, c, d, x[i + 13], 4, 0x289B7EC6)
    d = HH(d, a, b, c, x[i + 0], 11, 0xEAA127FA)
    c = HH(c, d, a, b, x[i + 3], 16, 0xD4EF3085)
    b = HH(b, c, d, a, x[i + 6], 23, 0x4881D05)
    a = HH(a, b, c, d, x[i + 9], 4, 0xD9D4D039)
    d = HH(d, a, b, c, x[i + 12], 11, 0xE6DB99E5)
    c = HH(c, d, a, b, x[i + 15], 16, 0x1FA27CF8)
    b = HH(b, c, d, a, x[i + 2], 23, 0xC4AC5665)

    a = II(a, b, c, d, x[i + 0], 6, 0xF4292244)
    d = II(d, a, b, c, x[i + 7], 10, 0x432AFF97)
    c = II(c, d, a, b, x[i + 14], 15, 0xAB9423A7)
    b = II(b, c, d, a, x[i + 5], 21, 0xFC93A039)
    a = II(a, b, c, d, x[i + 12], 6, 0x655B59C3)
    d = II(d, a, b, c, x[i + 3], 10, 0x8F0CCC92)
    c = II(c, d, a, b, x[i + 10], 15, 0xFFEFF47D)
    b = II(b, c, d, a, x[i + 1], 21, 0x85845DD1)
    a = II(a, b, c, d, x[i + 8], 6, 0x6FA87E4F)
    d = II(d, a, b, c, x[i + 15], 10, 0xFE2CE6E0)
    c = II(c, d, a, b, x[i + 6], 15, 0xA3014314)
    b = II(b, c, d, a, x[i + 13], 21, 0x4E0811A1)
    a = II(a, b, c, d, x[i + 4], 6, 0xF7537E82)
    d = II(d, a, b, c, x[i + 11], 10, 0xBD3AF235)
    c = II(c, d, a, b, x[i + 2], 15, 0x2AD7D2BB)
    b = II(b, c, d, a, x[i + 9], 21, 0xEB86D391)

    a = addUnsigned(a, oldA)
    b = addUnsigned(b, oldB)
    c = addUnsigned(c, oldC)
    d = addUnsigned(d, oldD)
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase()
}

/**
 * Generates MD5 hash - RFC 1321 compliant implementation
 */
export const generateMD5 = async (text: string): Promise<string> => {
  // Defensive: Handle null/undefined inputs
  if (text == null) text = ''
  if (typeof text !== 'string') text = String(text)
  
  try {
    return md5(text)
  } catch (error) {
    throw new Error(`MD5 generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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

