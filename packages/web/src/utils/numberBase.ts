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
    let decimal: number
    
    switch (fromBase) {
      case 'binary':
        decimal = parseInt(value.replace(/\s/g, ''), 2)
        if (isNaN(decimal)) {
          return {
            isValid: false,
            error: 'Invalid binary number. Use only 0 and 1'
          }
        }
        break
        
      case 'octal':
        decimal = parseInt(value.replace(/\s/g, ''), 8)
        if (isNaN(decimal)) {
          return {
            isValid: false,
            error: 'Invalid octal number. Use digits 0-7'
          }
        }
        break
        
      case 'decimal':
        decimal = parseInt(value.replace(/\s/g, ''), 10)
        if (isNaN(decimal)) {
          return {
            isValid: false,
            error: 'Invalid decimal number'
          }
        }
        break
        
      case 'hexadecimal':
        decimal = parseInt(value.replace(/\s/g, ''), 16)
        if (isNaN(decimal)) {
          return {
            isValid: false,
            error: 'Invalid hexadecimal number. Use digits 0-9 and letters A-F'
          }
        }
        break
    }
    
    if (decimal < 0) {
      return {
        isValid: false,
        error: 'Negative numbers are not supported'
      }
    }
    
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

export const performBitwiseOperations = (decimal: number): BitwiseOperations => {
  const binary = decimal.toString(2)
  const maxBits = Math.max(32, binary.length)
  
  return {
    and: (decimal & 0xFF).toString(2).padStart(8, '0'),
    or: (decimal | 0xFF).toString(2).padStart(8, '0'),
    xor: (decimal ^ 0xFF).toString(2).padStart(8, '0'),
    not: (~decimal >>> 0).toString(2).padStart(32, '0'),
    leftShift: (decimal << 1).toString(2).padStart(maxBits, '0'),
    rightShift: (decimal >> 1).toString(2).padStart(maxBits, '0')
  }
}

