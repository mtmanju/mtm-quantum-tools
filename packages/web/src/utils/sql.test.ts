import { describe, it, expect } from 'vitest'
import { formatSql, minifySql, validateSql } from './sql'

/**
 * The regression bar for both functions is the same: a string literal is data.
 * Whatever it contains — a comment marker, a keyword, a semicolon, a comma —
 * must come back byte for byte.
 */
describe('minifySql', () => {
  it('does not treat -- inside a string literal as a comment', () => {
    // Previously returned "SELECT * FROM t WHERE code = 'a" — the rest of the
    // query deleted, leaving an unterminated quote.
    expect(minifySql("SELECT * FROM t WHERE code = 'a--b'")).toBe(
      "SELECT * FROM t WHERE code = 'a--b'"
    )
  })

  it('does not treat /* */ inside a string literal as a comment', () => {
    expect(minifySql("SELECT * FROM t WHERE s = '/* x */'")).toBe(
      "SELECT * FROM t WHERE s = '/* x */'"
    )
  })

  it('preserves whitespace inside string literals', () => {
    expect(minifySql("SELECT * FROM t WHERE s = 'a, b'")).toBe(
      "SELECT * FROM t WHERE s = 'a, b'"
    )
    expect(minifySql("SELECT 'a   b'")).toBe("SELECT 'a   b'")
  })

  it('handles doubled-quote escapes', () => {
    expect(minifySql("SELECT 'it''s'")).toBe("SELECT 'it''s'")
  })

  it('still removes real comments', () => {
    expect(minifySql('SELECT a -- note\nFROM t')).toBe('SELECT a FROM t')
    expect(minifySql('SELECT a /* note */ FROM t')).toBe('SELECT a FROM t')
  })

  it('leaves a separator where a comment was removed', () => {
    // `SELECT/*x*/1` must not fuse into `SELECT1`.
    expect(minifySql('SELECT/*x*/1')).toBe('SELECT 1')
  })

  it('still collapses whitespace and tightens punctuation in code', () => {
    expect(minifySql('SELECT  id ,  name   FROM   t')).toBe('SELECT id,name FROM t')
    expect(minifySql('SELECT COUNT( * ) FROM t')).toBe('SELECT COUNT(*) FROM t')
  })

  it('returns empty for blank input', () => {
    expect(minifySql('')).toBe('')
    expect(minifySql('   ')).toBe('')
  })
})

describe('formatSql', () => {
  it('does not inject line breaks inside a string literal', () => {
    // The `;` used to be read as a statement separator: it was deleted and a
    // blank line inserted mid-string.
    expect(formatSql("SELECT * FROM t WHERE s = 'a;b'")).toContain("'a;b'")
  })

  it('does not reflow a keyword that appears inside a string literal', () => {
    expect(formatSql("SELECT * FROM t WHERE s = 'x select y'")).toContain("'x select y'")
  })

  it('preserves statement terminators', () => {
    const out = formatSql('SELECT 1; SELECT 2;')
    expect(out.match(/;/g)).toHaveLength(2)
  })

  it('keeps a line comment on its own line so it cannot swallow code', () => {
    const lines = formatSql('SELECT a -- note\nFROM t').split('\n')
    const commentLine = lines.find(l => l.includes('--'))
    expect(commentLine?.trim()).toBe('-- note')
    // FROM must not have been reflowed onto the commented line.
    expect(lines.some(l => /\bFROM\b/.test(l) && !l.includes('--'))).toBe(true)
  })

  it('still breaks clauses onto their own lines', () => {
    const out = formatSql('SELECT id FROM users WHERE age > 21')
    expect(out.split('\n').length).toBeGreaterThan(3)
    expect(out).toMatch(/^SELECT/)
  })

  it('returns empty for blank input', () => {
    expect(formatSql('')).toBe('')
    expect(formatSql('   ')).toBe('')
  })
})

describe('validateSql', () => {
  it('ignores parens and quotes inside literals and comments', () => {
    expect(validateSql("SELECT '(' FROM t").isValid).toBe(true)
    expect(validateSql('SELECT 1 -- (\nFROM t').isValid).toBe(true)
  })

  it('catches genuinely unbalanced input', () => {
    expect(validateSql('SELECT (1 FROM t').isValid).toBe(false)
    expect(validateSql("SELECT 'a FROM t").isValid).toBe(false)
  })
})
