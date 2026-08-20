import { describe, it, expect } from 'vitest'
import { generateUUID, generateUUIDs, isValidUUID } from './uuid'

const RFC = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('generateUUID v4', () => {
  it('matches the RFC 4122 layout', () => {
    const u = generateUUID('v4')
    expect(u).toMatch(RFC)
    expect(u[14]).toBe('4')
    expect('89ab').toContain(u[19].toLowerCase())
  })
  it('does not repeat', () => {
    const many = generateUUIDs(500, 'v4')
    expect(new Set(many).size).toBe(500)
  })
})

/**
 * v1 used to emit strings that this module's own isValidUUID() rejected: the
 * node field was `hex.substring(3)` — 17 characters out of a 20-character
 * buffer, where the field is 12. It also derived the high time bits with
 * `timestamp >> 32` and `>> 48`, which JavaScript truncates to 32 bits, so
 * both were no-ops returning the low bits.
 */
describe('generateUUID v1', () => {
  it('is a well-formed UUID', () => {
    const u = generateUUID('v1')
    expect(u).toMatch(RFC)
    expect(u).toHaveLength(36)
  })

  it('passes this module\'s own validator', () => {
    expect(isValidUUID(generateUUID('v1'))).toBe(true)
  })

  it('carries version 1 and the RFC 4122 variant', () => {
    const u = generateUUID('v1')
    expect(u[14]).toBe('1')
    expect('89ab').toContain(u[19].toLowerCase())
  })

  it('sets the multicast bit on the random node, per RFC 4122 §4.5', () => {
    // Guarantees a randomly generated node can never collide with a real MAC.
    const node = generateUUID('v1').split('-')[4]
    expect(parseInt(node.slice(0, 2), 16) & 0x01).toBe(1)
  })

  it('advances with the clock rather than repeating', () => {
    const many = generateUUIDs(50, 'v1')
    expect(new Set(many).size).toBe(50)
  })
})

describe('isValidUUID', () => {
  it.each(['', 'not-a-uuid', '123e4567-e89b-12d3-a456-42661417400', 'zzz', '123e4567e89b12d3a45642661417400x'])(
    'rejects %j', (bad) => expect(isValidUUID(bad)).toBe(false)
  )
  it('accepts a canonical UUID', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
  })
})
