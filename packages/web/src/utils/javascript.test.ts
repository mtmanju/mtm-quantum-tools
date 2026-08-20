import { describe, it, expect } from 'vitest'
import { minifyJavaScript, formatJavaScript } from './javascript'

const min = (js: string) => {
  const r = minifyJavaScript(js)
  if (!r.isValid) throw new Error(r.error)
  return r.formatted!
}

/**
 * The minifier was a chain of blind .replace() calls with no idea what a
 * string literal was. It rewrote program data, not just formatting.
 */
describe('minifyJavaScript — never alters literal contents', () => {
  it('keeps whitespace inside a string', () => {
    expect(min('const s = "a  b";')).toBe('const s="a  b";')
  })

  it('keeps whitespace inside a regex literal', () => {
    // Collapsing this changes what the pattern matches.
    expect(min('const r = /a  b/;')).toBe('const r=/a  b/;')
  })

  it('does not treat // inside a string as a comment', () => {
    // Every URL in a source file hit this: the line was truncated at the //.
    expect(min('const url = "https://x.com//path"; // real comment'))
      .toBe('const url="https://x.com//path";')
  })

  it('does not treat a comment sequence inside a string as a comment', () => {
    expect(min("const s = '/* not a comment */';")).toBe("const s='/* not a comment */';")
  })

  it('preserves template literals', () => {
    expect(min('const t = `a  b`;')).toBe('const t=`a  b`;')
  })

  it('handles escaped quotes', () => {
    expect(min('const s = "he said \\"hi\\"  ok";')).toBe('const s="he said \\"hi\\"  ok";')
  })

  it('preserves escape sequences', () => {
    expect(min('const s = "line1\\nline2";')).toBe('const s="line1\\nline2";')
  })
})

describe('minifyJavaScript — regex vs division', () => {
  it('tells them apart', () => {
    // `/` after an identifier is division; after `=` it opens a regex.
    expect(min('const div = a / b; const re = /x/g;')).toBe('const div=a/b;const re=/x/g;')
  })
})

describe('minifyJavaScript — does the actual job', () => {
  it('removes comments and collapses code whitespace', () => {
    expect(min('function f() {\n  return 1;\n}')).toBe('function f(){return 1;}')
    expect(min('let a=1;/* block */let b=2;')).toBe('let a=1;let b=2;')
  })

  it('keeps the space between two identifiers', () => {
    // `return1` would be a different program.
    expect(min('function f() { return 1 }')).toContain('return 1')
  })

  it('rejects empty input', () => {
    expect(minifyJavaScript('').isValid).toBe(false)
  })
})

describe('formatJavaScript', () => {
  it('indents a function body', () => {
    const r = formatJavaScript('function f(){return 1}')
    expect(r.isValid).toBe(true)
    expect(r.formatted).toContain('\n')
  })
})
