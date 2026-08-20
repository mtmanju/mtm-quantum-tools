import { describe, it, expect } from 'vitest'
import { testRegex, escapeRegex, replaceRegex, flagsToString } from './regex'

const FLAGS = {
  global: true, caseInsensitive: false, multiline: false,
  dotAll: false, unicode: false, sticky: false,
}
const f = (over: Partial<typeof FLAGS> = {}) => ({ ...FLAGS, ...over })

describe('testRegex', () => {
  it('reports each match with its index and capture groups', () => {
    const r = testRegex('(\\d+)-(\\d+)', 'a 12-34 b 56-78', f())
    expect(r.isValid).toBe(true)
    expect(r.matches).toEqual([
      { match: '12-34', index: 2, groups: ['12', '34'] },
      { match: '56-78', index: 10, groups: ['56', '78'] },
    ])
  })

  it('exposes named capture groups', () => {
    const r = testRegex('(?<y>\\d{4})-(?<m>\\d{2})', '2023-06', f())
    expect(r.matches[0].namedGroups).toEqual({ y: '2023', m: '06' })
  })

  it('honours the global flag', () => {
    expect(testRegex('a', 'aaa', f()).matches).toHaveLength(3)
    expect(testRegex('a', 'aaa', f({ global: false })).matches).toHaveLength(1)
  })

  it('honours case insensitivity', () => {
    expect(testRegex('abc', 'ABC', f()).matches).toHaveLength(0)
    expect(testRegex('abc', 'ABC', f({ caseInsensitive: true })).matches).toHaveLength(1)
  })

  it('honours multiline anchors', () => {
    expect(testRegex('^b', 'a\nb', f()).matches).toHaveLength(0)
    expect(testRegex('^b', 'a\nb', f({ multiline: true })).matches).toHaveLength(1)
  })

  it('honours dotAll', () => {
    expect(testRegex('a.b', 'a\nb', f()).matches).toHaveLength(0)
    expect(testRegex('a.b', 'a\nb', f({ dotAll: true })).matches).toHaveLength(1)
  })

  /**
   * A zero-width pattern with /g advances lastIndex by nothing, so a naive
   * exec() loop never terminates. This must return, not hang the tab.
   */
  it('terminates on a zero-length match', () => {
    const r = testRegex('a*', 'bbb', f())
    expect(r.isValid).toBe(true)
    expect(r.matches).toHaveLength(4) // empty match at each position, incl. end
  })

  it('reports a malformed pattern instead of throwing', () => {
    const r = testRegex('(unclosed', 'x', f())
    expect(r.isValid).toBe(false)
    expect(r.error).toMatch(/Unterminated group/)
  })

  it('treats an empty pattern as no-op, not a match-everything', () => {
    expect(testRegex('', 'abc', f()).matches).toHaveLength(0)
  })
})

describe('escapeRegex', () => {
  it('neutralises every metacharacter so the string matches itself literally', () => {
    const literal = 'a.b*c+d?e[f]g(h)i{j}k|l^m$n\\o'
    const r = testRegex(escapeRegex(literal), literal, f())
    expect(r.isValid).toBe(true)
    expect(r.matches).toHaveLength(1)
    expect(r.matches[0].match).toBe(literal)
  })
})

describe('replaceRegex', () => {
  it('supports positional backreferences', () => {
    const r = replaceRegex('(\\w+)@(\\w+)', 'me@here you@there', '$2:$1', f())
    expect(r.isValid).toBe(true)
    expect(r.replaced).toBe('here:me there:you')
    expect(r.replacements).toBe(2)
  })

  it('replaces only once without the global flag', () => {
    const r = replaceRegex('a', 'aaa', 'X', f({ global: false }))
    expect(r.replaced).toBe('Xaa')
  })
})

describe('flagsToString', () => {
  it('emits flags in a stable order', () => {
    expect(flagsToString(f({ global: false }))).toBe('')
    expect(flagsToString(f())).toBe('g')
    expect(flagsToString(f({ caseInsensitive: true, multiline: true }))).toContain('i')
  })
})
