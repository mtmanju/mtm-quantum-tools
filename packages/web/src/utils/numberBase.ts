export type NumberBase = 'binary' | 'octal' | 'decimal' | 'hexadecimal'

export interface NumberBaseConversion {
  binary: string
  octal: string
  decimal: string
  hexadecimal: string
}

export interface ConversionResult {
  isValid: boolean
  result?: NumberBaseConversion
  error?: string
}

const BASE_NAMES: Record<NumberBase, string> = {
  binary: 'Binary (Base 2)',
  octal: 'Octal (Base 8)',
  decimal: 'Decimal (Base 10)',
  hexadecimal: 'Hexadecimal (Base 16)'
}

export const getBaseName = (base: NumberBase): string => BASE_NAMES[base]

/**
 * Which digits each base actually permits.
 *
 * `parseInt` cannot express this: per ECMA-262 it consumes the longest valid
 * *prefix* and returns NaN only when the very first character is invalid. So
 * every error branch below used to be unreachable for realistic bad input —
 * `102` in binary returned 2, `789` in octal returned 7, `12abc` in decimal
 * returned 12, and each was reported as `isValid: true`. The user saw a
 * confident conversion of a number they had not typed.
 */
const BASE_DIGITS: Record<NumberBase, RegExp> = {
  binary: /^[01]+$/,
  octal: /^[0-7]+$/,
  decimal: /^[0-9]+$/,
  hexadecimal: /^[0-9a-fA-F]+$/,
}

const BASE_ERRORS: Record<NumberBase, string> = {
  binary: 'Invalid binary number. Use only 0 and 1',
  octal: 'Invalid octal number. Use digits 0-7',
  decimal: 'Invalid decimal number',
  hexadecimal: 'Invalid hexadecimal number. Use digits 0-9 and letters A-F',
}

/** Literal prefixes a user is likely to paste in, stripped before validation. */
const BASE_PREFIXES: Record<NumberBase, RegExp> = {
  binary: /^0b/i,
  octal: /^0o/i,
  decimal: /^$/,
  hexadecimal: /^0x/i,
}

/** BigInt understands these, so parsing stays exact at any width. */
const BIGINT_PREFIX: Record<NumberBase, string> = {
  binary: '0b',
  octal: '0o',
  decimal: '',
  hexadecimal: '0x',
}

export const convertNumberBase = (
  value: string,
  fromBase: NumberBase
): ConversionResult => {
  if (!value.trim()) {
    return {
      isValid: false,
      error: 'Please enter a number'
    }
  }

  try {
    const cleaned = value.replace(/\s/g, '').replace(BASE_PREFIXES[fromBase], '')

    if (!BASE_DIGITS[fromBase].test(cleaned)) {
      return {
        isValid: false,
        error: BASE_ERRORS[fromBase]
      }
    }

    // Parsed as BigInt so the digits are read exactly; a value too wide for a
    // double is then rejected rather than silently rounded.
    const exact = BigInt(BIGINT_PREFIX[fromBase] + cleaned)

    if (exact > BigInt(Number.MAX_SAFE_INTEGER)) {
      return {
        isValid: false,
        error: 'Number too large for precise conversion'
      }
    }

    const decimal = Number(exact)

    const result: NumberBaseConversion = {
      binary: decimal.toString(2),
      octal: decimal.toString(8),
      decimal: decimal.toString(10),
      hexadecimal: decimal.toString(16).toUpperCase()
    }

    return {
      isValid: true,
      result
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Conversion failed'
    }
  }
}

export const formatBinary = (binary: string): string => {
  return binary.replace(/(.{4})/g, '$1 ').trim()
}

export const formatHex = (hex: string): string => {
  return hex.replace(/(.{2})/g, '$1 ').trim()
}

/**
 * Performs bitwise operations on numbers
 */
export interface BitwiseOperations {
  and: string
  or: string
  xor: string
  not: string
  leftShift: string
  rightShift: string
}

/**
 * Bitwise views of a value, computed with BigInt.
 *
 * JavaScript's bitwise operators coerce to a signed 32-bit integer, so
 * `decimal << 1` overflowed for anything from 2^30 up: the result went
 * negative and `padStart` then padded a string that already contained a minus
 * sign, emitting malformed "binary" such as `00-10001100101001101100000000000`.
 * The UI only guarded above 2^31, leaving the whole 2^30..2^31-1 range broken.
 * `& | ^` had the same 32-bit ceiling for values above 2^31, which this type
 * permits up to MAX_SAFE_INTEGER.
 *
 * NOT needs a width to be meaningful at all, so it is taken over the same
 * width used for the shifts: at least 32 bits, more if the value needs it.
 */
export const performBitwiseOperations = (decimal: number): BitwiseOperations => {
  const n = BigInt(Math.max(0, Math.trunc(decimal)))
  const width = Math.max(32, n.toString(2).length)
  const mask = (1n << BigInt(width)) - 1n

  return {
    and: (n & 0xFFn).toString(2).padStart(8, '0'),
    or: (n | 0xFFn).toString(2).padStart(8, '0'),
    xor: (n ^ 0xFFn).toString(2).padStart(8, '0'),
    not: (~n & mask).toString(2).padStart(width, '0'),
    leftShift: (n << 1n).toString(2).padStart(width, '0'),
    rightShift: (n >> 1n).toString(2).padStart(width, '0')
  }
}
