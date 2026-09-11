import { describe, expect, it } from 'vitest'
import { formatYaml, validateYaml } from './yaml'

describe('validateYaml', () => {
  it('rejects empty input', () => {
    expect(validateYaml('   ').isValid).toBe(false)
  })

  it('accepts a well-formed document', () => {
    expect(validateYaml('name: test\nitems:\n  - a\n  - b\n').isValid).toBe(true)
  })

  // The four cases the previous line-scanning validator accepted as valid.
  it('rejects an unterminated quoted scalar', () => {
    const result = validateYaml('a: "unclosed')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/Line 1/)
  })

  it('rejects an unterminated flow sequence', () => {
    expect(validateYaml('a: [1,2').isValid).toBe(false)
  })

  it('rejects duplicate keys', () => {
    const result = validateYaml('a: 1\na: 2')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/unique/i)
    expect(result.error).toMatch(/Line 2/)
  })

  it('rejects tabs used as indentation', () => {
    expect(validateYaml('a:\n\tb: 1').isValid).toBe(false)
  })

  // The case it wrongly rejected: indentation only has to be consistent, not even.
  it('accepts three-space indentation', () => {
    expect(validateYaml('a:\n   b: 1\n   c: 2\n').isValid).toBe(true)
  })

  it('accepts comments, anchors and block scalars', () => {
    const src = '# heading\nbase: &anchor\n  x: 1\ncopy:\n  <<: *anchor\ntext: |\n  line one\n  line two\n'
    expect(validateYaml(src).isValid).toBe(true)
  })

  it('accepts a multi-document stream', () => {
    expect(validateYaml('a: 1\n---\nb: 2\n').isValid).toBe(true)
  })

  it('reports the line of the first error', () => {
    const result = validateYaml('a: 1\nb: 2\n\tc: 3\n')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/Line 3/)
  })

  // An unterminated flow collection is only knowable at the end of the input,
  // so the position reported is the end, not the opening bracket.
  it('points at the end of the document for an unterminated collection', () => {
    expect(validateYaml('a: 1\nb: [1,2\n').error).toMatch(/Line 3/)
  })

  it('keeps the error to a single line', () => {
    const result = validateYaml('a: "unclosed')
    expect(result.error).not.toContain('\n')
  })
})

describe('formatYaml', () => {
  it('returns empty for blank input', () => {
    expect(formatYaml('')).toBe('')
  })

  it('normalises indentation to the requested width', () => {
    expect(formatYaml('a:\n      b: 1\n', 2)).toBe('a:\n  b: 1\n')
    expect(formatYaml('a:\n  b: 1\n', 4)).toBe('a:\n    b: 1\n')
  })

  it('collapses extra spacing after a key', () => {
    expect(formatYaml('name:    test\n')).toBe('name: test\n')
  })

  it('preserves comments', () => {
    expect(formatYaml('# leading\na: 1\n')).toContain('# leading')
  })

  // The old counter-based re-indenter flattened these into the surrounding map.
  it('preserves block scalars verbatim', () => {
    const src = 'script: |\n  echo one\n  echo two\n'
    expect(formatYaml(src, 2)).toBe(src)
  })

  it('preserves nested sequences of mappings', () => {
    const src = 'steps:\n  - name: a\n    run: x\n  - name: b\n    run: y\n'
    expect(formatYaml(src, 2)).toBe(src)
  })

  it('keeps a multi-document stream separated', () => {
    expect(formatYaml('a: 1\n---\nb: 2\n')).toBe('a: 1\n---\nb: 2\n')
  })

  it('returns empty rather than guessing at invalid input', () => {
    expect(formatYaml('a: [1,2')).toBe('')
  })

  it('clamps an out-of-range indent instead of throwing', () => {
    expect(() => formatYaml('a:\n  b: 1\n', 0)).not.toThrow()
    expect(() => formatYaml('a:\n  b: 1\n', 99)).not.toThrow()
  })

  it('round-trips its own output', () => {
    const once = formatYaml('a:\n   b: 1\n   c:\n    - 1\n    - 2\n', 2)
    expect(formatYaml(once, 2)).toBe(once)
  })
})
