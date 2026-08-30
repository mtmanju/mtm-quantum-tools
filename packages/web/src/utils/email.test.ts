import { describe, it, expect } from 'vitest'
import { validateEmail } from './email'

const strict = (email: string) => validateEmail(email, true)
const loose = (email: string) => validateEmail(email, false)

describe('validateEmail — strict mode', () => {
  /**
   * The local-part class put `.` inside the atom, which makes a dot an ordinary
   * character. RFC 5322 §3.2.3 defines a dot-atom as `atom ('.' atom)*`, so a
   * dot separates atoms and cannot lead, trail, or repeat.
   */
  it.each([
    ['consecutive dots', 'a..b@example.com'],
    ['a leading dot', '.user@example.com'],
    ['a trailing dot', 'user.@example.com'],
  ])('rejects %s', (_label, email) => {
    expect(strict(email).isValid).toBe(false)
  })

  it('enforces the 64-character local part limit', () => {
    // RFC 5321 §4.5.3.1. Nothing checked this: only an over-long *domain*
    // caused a long address to be rejected.
    expect(strict('a'.repeat(64) + '@example.com').isValid).toBe(true)
    expect(strict('a'.repeat(65) + '@example.com').isValid).toBe(false)
    expect(strict('a'.repeat(65) + '@example.com').error).toMatch(/local part/i)
  })

  it('enforces the 254-character total limit', () => {
    // Sized so every label and the domain as a whole stay legal: only the
    // total is over, which is the case nothing used to check.
    const local = 'a'.repeat(60)
    const domain =
      'b'.repeat(60) + '.' + 'c'.repeat(60) + '.' + 'd'.repeat(60) + '.' + 'e'.repeat(30) + '.com'
    const address = `${local}@${domain}`
    expect(domain.length).toBeLessThanOrEqual(253)
    expect(address.length).toBeGreaterThan(254)

    const result = strict(address)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/exceeds maximum length \(254/)
  })

  it.each([
    'user@example.com',
    'first.last@example.com',
    'user+tag@sub.example.co.uk',
    'a_b-c@example.com',
    "o'brien@example.com",
    'user!#$%&*+/=?^_`{|}~@example.com',
  ])('accepts the valid address %s', email => {
    expect(strict(email).isValid).toBe(true)
  })

  it('reports more than one @ accurately', () => {
    // `parts.length === 2` made hasAt false, so this said "Missing @ symbol"
    // about an address containing two of them.
    const result = strict('user@@example.com')
    expect(result.isValid).toBe(false)
    expect(result.error).not.toMatch(/missing @/i)
    expect(result.error).toMatch(/more than one @/i)
  })

  it('still rejects the obvious cases', () => {
    expect(strict('').isValid).toBe(false)
    expect(strict('no-at-sign').isValid).toBe(false)
    expect(strict('user@').isValid).toBe(false)
    expect(strict('user@nodot').isValid).toBe(false)
    expect(strict('user@-example.com').isValid).toBe(false)
  })
})

describe('validateEmail — loose mode', () => {
  it('accepts ordinary addresses', () => {
    expect(loose('user@example.com').isValid).toBe(true)
    expect(loose('first.last@sub.example.com').isValid).toBe(true)
  })

  it('rejects input with no @ or no dot', () => {
    expect(loose('nope').isValid).toBe(false)
    expect(loose('user@nodot').isValid).toBe(false)
  })
})
