import { describe, it, expect } from 'vitest'
import { formatCss, minifyCss, validateCss } from './css'

const min = (css: string) => minifyCss(css).formatted
const fmt = (css: string) => formatCss(css).formatted

describe('minifyCss', () => {
  it('preserves whitespace around + and - so calc() stays valid', () => {
    // CSS Values L3 §8.1: the operands of + and - inside calc() must be
    // whitespace-separated. `calc(100%+20px)` is a parse error and the browser
    // drops the whole declaration.
    expect(min('.a{width:calc(100% + 20px)}')).toBe('.a{width:calc(100% + 20px)}')
    expect(min('.a{margin:calc(10px - 2px) auto}')).toBe('.a{margin:calc(10px - 2px) auto}')
  })

  it('does not read comment delimiters inside a string', () => {
    expect(min('.a{content:"/* not a comment */"}')).toBe('.a{content:"/* not a comment */"}')
  })

  it('preserves punctuation and spacing inside string values', () => {
    expect(min('.a{content:"a; b"}')).toBe('.a{content:"a; b"}')
    expect(min('.a{content:"a: b"}')).toBe('.a{content:"a: b"}')
    expect(min('.a{font-family:"Foo, Bar"}')).toBe('.a{font-family:"Foo, Bar"}')
  })

  it('keeps an unquoted url() intact', () => {
    const css = '.a{background:url(data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)}'
    expect(min(css)).toBe(css)
  })

  it('still minifies ordinary rules', () => {
    expect(min('.a  {  color : red ;  }')).toBe('.a{color:red}')
    expect(min('.a > .b{color:red}')).toBe('.a>.b{color:red}')
  })

  it('still removes real comments, leaving a separator', () => {
    expect(min('/* lead */ .a{color:red}')).toBe('.a{color:red}')
    expect(min('.a{color:red}/* tail */')).toBe('.a{color:red}')
  })

  it('reports blank input as invalid', () => {
    expect(minifyCss('').isValid).toBe(false)
  })
})

describe('formatCss', () => {
  it('does not break an unquoted url() across lines', () => {
    // A newline inside an unquoted url token is a syntax error.
    const out = fmt('.a{background:url(data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)}')
    expect(out).toContain('url(data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)')
    expect(out?.split('\n').some(l => l.includes('base64') && l.includes('url('))).toBe(true)
  })

  it('does not act on structural characters inside a string', () => {
    expect(fmt('.a{content:"a; b"}')).toContain('content:"a; b"')
    expect(fmt('.a{content:"}"}')).toContain('content:"}"')
  })

  it('indents nested rules', () => {
    expect(fmt('@media (min-width: 600px){.a{color:red}}')).toBe(
      '@media (min-width: 600px) {\n  .a {\n    color:red\n  }\n}'
    )
  })

  it('puts one declaration per line', () => {
    expect(fmt('.a{color:red;background:blue}')).toBe(
      '.a {\n  color:red;\n  background:blue\n}'
    )
  })

  it('reports blank input as invalid', () => {
    expect(formatCss('').isValid).toBe(false)
  })
})

describe('validateCss', () => {
  it('ignores braces inside strings', () => {
    expect(validateCss('.a{content:"}"}').isValid).toBe(true)
  })

  it('catches unbalanced braces', () => {
    expect(validateCss('.a{color:red').isValid).toBe(false)
    expect(validateCss('.a{color:red}}').isValid).toBe(false)
  })
})
