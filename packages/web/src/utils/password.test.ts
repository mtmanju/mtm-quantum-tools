import { describe, it, expect } from 'vitest'
import { generatePassword, calculatePasswordEntropy } from './password'

const ALL_CLASSES = {
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeSimilar: false,
  excludeAmbiguous: false,
}

const SYMBOL = /[^a-zA-Z0-9]/

describe('generatePassword', () => {
  /**
   * Ticking "Include Numbers" used to make digits merely *possible*: all the
   * selected classes were concatenated into one charset and every position
   * drawn from it. At length 8 with all four boxes ticked, 51% of generated
   * passwords lacked at least one ticked class, so a user asking for digits
   * could receive `&Jr|.!UO` and fail the target site's policy.
   */
  it.each([4, 8, 12, 32])('always includes every selected class at length %i', length => {
    for (let i = 0; i < 500; i++) {
      const p = generatePassword({ ...ALL_CLASSES, length })
      expect(p).toHaveLength(length)
      expect(p).toMatch(/[a-z]/)
      expect(p).toMatch(/[A-Z]/)
      expect(p).toMatch(/[0-9]/)
      expect(p).toMatch(SYMBOL)
    }
  })

  it('honours a subset of classes without leaking the others', () => {
    for (let i = 0; i < 300; i++) {
      const p = generatePassword({
        ...ALL_CLASSES,
        includeSymbols: false,
        includeUppercase: false,
        length: 10,
      })
      expect(p).toMatch(/^[a-z0-9]+$/)
      expect(p).toMatch(/[a-z]/)
      expect(p).toMatch(/[0-9]/)
    }
  })

  /**
   * The guaranteed characters must be shuffled, not written to fixed leading
   * indices — a fixed layout makes the first positions predictable by class and
   * leaks structure to anyone cracking the output.
   */
  it('does not place guaranteed characters at fixed positions', () => {
    const firstIsDigit = new Set<number>()
    for (let i = 0; i < 400; i++) {
      const p = generatePassword({ ...ALL_CLASSES, length: 8 })
      p.split('').forEach((c, idx) => {
        if (/[0-9]/.test(c)) firstIsDigit.add(idx)
      })
    }
    // A digit must have appeared at every index across the sample.
    expect(firstIsDigit.size).toBe(8)
  })

  it('respects excludeSimilar', () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword({ ...ALL_CLASSES, excludeSimilar: true, length: 20 })
      expect(p).not.toMatch(/[il1Lo0O]/)
    }
  })

  it('produces the requested length even when it cannot fit every class', () => {
    expect(generatePassword({ ...ALL_CLASSES, length: 2 })).toHaveLength(2)
    expect(generatePassword({ ...ALL_CLASSES, length: 1 })).toHaveLength(1)
  })

  it('rejects a non-positive length instead of throwing RangeError', () => {
    expect(() => generatePassword({ ...ALL_CLASSES, length: 0 })).toThrow(
      /positive whole number/
    )
    // Previously an uncaught `RangeError: Invalid typed array length: -1`.
    expect(() => generatePassword({ ...ALL_CLASSES, length: -1 })).toThrow(
      /positive whole number/
    )
  })

  it('throws when no character class is selected', () => {
    expect(() =>
      generatePassword({
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false,
        length: 10,
      })
    ).toThrow(/At least one character type/)
  })

  it('does not repeat itself', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) seen.add(generatePassword({ ...ALL_CLASSES, length: 16 }))
    expect(seen.size).toBe(500)
  })

  it('draws roughly uniformly from the charset', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 4000; i++) {
      for (const ch of generatePassword({
        ...ALL_CLASSES,
        includeUppercase: false,
        includeNumbers: false,
        includeSymbols: false,
        length: 8,
      })) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1)
      }
    }
    expect(counts.size).toBe(26)
    const values = [...counts.values()]
    const expected = 32000 / 26
    // Generous band: this catches a broken distribution, not statistical noise.
    expect(Math.min(...values)).toBeGreaterThan(expected * 0.8)
    expect(Math.max(...values)).toBeLessThan(expected * 1.2)
  })
})

describe('calculatePasswordEntropy', () => {
  /**
   * `Math.log2(Math.pow(charsetSize, length))` overflows the double before the
   * log is taken — around 172 characters at charset 63 — so a long passphrase
   * reported Infinity, which rendered as the literal string "Infinity".
   */
  it.each([160, 172, 200, 400, 1000])('stays finite at length %i', length => {
    const password = 'Aa1!' + 'a'.repeat(length - 4)
    const entropy = calculatePasswordEntropy(password)
    expect(Number.isFinite(entropy)).toBe(true)
    expect(entropy).toBeCloseTo(length * Math.log2(63), 5)
  })

  it('is zero for an empty password', () => {
    expect(calculatePasswordEntropy('')).toBe(0)
  })

  it('grows linearly with length', () => {
    const a = calculatePasswordEntropy('abcdefgh')
    const b = calculatePasswordEntropy('abcdefghabcdefgh')
    expect(b).toBeCloseTo(a * 2, 6)
  })
})
