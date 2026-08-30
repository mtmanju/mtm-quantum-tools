import { describe, it, expect } from 'vitest'
import { convertNumberBase, performBitwiseOperations } from './numberBase'
import { validateNumberBase } from './validation'

describe('convertNumberBase', () => {
  /**
   * `parseInt` consumes the longest valid *prefix* and returns NaN only when
   * the first character is invalid, so every error branch in this file used to
   * be unreachable for realistic bad input — the tool returned a confident
   * conversion of a number the user had not typed.
   */
  it.each([
    ['102', 'binary'],
    ['1012', 'binary'],
    ['1g', 'hexadecimal'],
    ['789', 'octal'],
    ['12.5', 'decimal'],
    ['12abc', 'decimal'],
    ['1e3', 'decimal'],
    ['0x1F', 'decimal'],
    ['-5', 'decimal'],
  ] as const)('rejects %s as %s', (value, base) => {
    const result = convertNumberBase(value, base)
    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it.each([
    ['1010', 'binary', '10'],
    ['0b1010', 'binary', '10'],
    ['777', 'octal', '511'],
    ['0o777', 'octal', '511'],
    ['FF', 'hexadecimal', '255'],
    ['ff', 'hexadecimal', '255'],
    ['0xFF', 'hexadecimal', '255'],
    ['255', 'decimal', '255'],
  ] as const)('converts %s from %s to decimal %s', (value, base, expected) => {
    const result = convertNumberBase(value, base)
    expect(result.isValid).toBe(true)
    expect(result.result?.decimal).toBe(expected)
  })

  it('converts across all four bases consistently', () => {
    const r = convertNumberBase('255', 'decimal').result!
    expect(r).toEqual({ binary: '11111111', octal: '377', decimal: '255', hexadecimal: 'FF' })
  })

  it('accepts the largest exactly-representable integer and rejects beyond it', () => {
    expect(convertNumberBase('9007199254740991', 'decimal').isValid).toBe(true)
    expect(convertNumberBase('9007199254740993', 'decimal').isValid).toBe(false)
  })

  it('rejects empty input', () => {
    expect(convertNumberBase('', 'decimal').isValid).toBe(false)
    expect(convertNumberBase('   ', 'decimal').isValid).toBe(false)
  })
})

describe('validateNumberBase', () => {
  it('checks the whole string, not just the first digit', () => {
    expect(validateNumberBase('12', 2)).toBe(false)
    expect(validateNumberBase('1234', 2)).toBe(false)
    expect(validateNumberBase('789', 8)).toBe(false)
    expect(validateNumberBase('12abc', 10)).toBe(false)
    expect(validateNumberBase('1.9', 10)).toBe(false)
  })

  it('accepts valid input for each base', () => {
    expect(validateNumberBase('1010', 2)).toBe(true)
    expect(validateNumberBase('777', 8)).toBe(true)
    expect(validateNumberBase('123', 10)).toBe(true)
    expect(validateNumberBase('1fA', 16)).toBe(true)
  })

  it('rejects empty input', () => {
    expect(validateNumberBase('', 10)).toBe(false)
    expect(validateNumberBase('   ', 10)).toBe(false)
  })
})

describe('performBitwiseOperations', () => {
  /**
   * JavaScript's bitwise operators coerce to signed int32, so `decimal << 1`
   * went negative from 2^30 up and `padStart` then padded a string that already
   * contained a minus sign — emitting "binary" with a `-` embedded mid-string.
   */
  it.each([1, 255, 1_073_741_823, 1_073_741_824, 2_000_000_000, 2_147_483_647, 5_000_000_000])(
    'shifts %i without int32 overflow',
    n => {
      const { leftShift, rightShift } = performBitwiseOperations(n)
      expect(leftShift).toMatch(/^[01]+$/)
      expect(rightShift).toMatch(/^[01]+$/)
      // Compared as values: stripping leading zeros would turn a result of 0
      // into the empty string.
      expect(BigInt(`0b${leftShift}`)).toBe(BigInt(n) * 2n)
      expect(BigInt(`0b${rightShift}`)).toBe(BigInt(n) / 2n)
    }
  )

  it('never emits a non-binary character', () => {
    for (const n of [0, 1, 2 ** 30, 2 ** 31, 2 ** 32, Number.MAX_SAFE_INTEGER]) {
      const ops = performBitwiseOperations(n)
      for (const value of Object.values(ops)) {
        expect(value).toMatch(/^[01]+$/)
      }
    }
  })

  it('keeps the 32-bit NOT for small values', () => {
    expect(performBitwiseOperations(0).not).toBe('1'.repeat(32))
  })

  it('masks AND/OR/XOR against 0xFF as before', () => {
    expect(performBitwiseOperations(255).and).toBe('11111111')
    expect(performBitwiseOperations(0).or).toBe('11111111')
    expect(performBitwiseOperations(255).xor).toBe('00000000')
  })
})
