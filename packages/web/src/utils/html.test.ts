import { describe, it, expect } from 'vitest'
import { minifyHtml, formatHtml } from './html'

describe('minifyHtml — whitespace-significant regions survive', () => {
  it('leaves <pre> content byte for byte', () => {
    // <pre> means "this whitespace is the content".
    expect(minifyHtml('<pre>  keep\n  me  </pre>')).toBe('<pre>  keep\n  me  </pre>')
  })

  it('leaves <textarea> content alone', () => {
    expect(minifyHtml('<textarea>  a\n  b  </textarea>')).toBe('<textarea>  a\n  b  </textarea>')
  })

  it('leaves <script> alone', () => {
    // Collapsing here can join a // comment to the code after it.
    const src = '<script>var a = 1; // note\nvar b = 2;</script>'
    expect(minifyHtml(src)).toBe(src)
  })

  it('leaves <style> alone', () => {
    const src = '<style>a { color : red }</style>'
    expect(minifyHtml(src)).toBe(src)
  })
})

describe('minifyHtml — does not corrupt visible text', () => {
  it('keeps spaces after punctuation in prose', () => {
    // A CSS minifier's rule had been applied to HTML, so "Hello, world"
    // minified to "Hello,world".
    expect(minifyHtml('<p>Hello, world: how are you; fine</p>'))
      .toBe('<p>Hello, world: how are you; fine</p>')
  })
})

describe('minifyHtml — does the actual job', () => {
  it('drops whitespace between tags', () => {
    expect(minifyHtml('<div>\n  <p>x</p>\n</div>')).toBe('<div><p>x</p></div>')
  })
  it('removes comments', () => {
    expect(minifyHtml('<div><!-- gone --><span>x</span></div>'))
      .toBe('<div><span>x</span></div>')
  })
  it('returns empty for empty input', () => {
    expect(minifyHtml('')).toBe('')
  })
})

describe('formatHtml', () => {
  it('indents nested elements', () => {
    expect(formatHtml('<div><p>x</p></div>')).toContain('\n')
  })
})
