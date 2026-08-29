import { describe, it, expect } from 'vitest'
import { segmentSource, mapCode } from './segment'

const SQL = {
  quotes: ["'", '"'],
  backslashEscapes: true,
  doubledQuoteEscapes: true,
  lineComment: '--',
  blockComment: ['/*', '*/'],
} as const

describe('segmentSource', () => {
  it('keeps a line-comment marker inside a string as string content', () => {
    const spans = segmentSource("WHERE c = 'a--b'", SQL)
    expect(spans.find(s => s.kind === 'comment')).toBeUndefined()
    expect(spans.find(s => s.kind === 'string')?.text).toBe("'a--b'")
  })

  it('keeps a block-comment marker inside a string as string content', () => {
    const spans = segmentSource("WHERE c = '/* x */'", SQL)
    expect(spans.find(s => s.kind === 'comment')).toBeUndefined()
    expect(spans.find(s => s.kind === 'string')?.text).toBe("'/* x */'")
  })

  it('does not treat a quote inside a comment as opening a string', () => {
    const spans = segmentSource("SELECT 1 -- it's fine\nFROM t", SQL)
    expect(spans.find(s => s.kind === 'comment')?.text).toBe("-- it's fine")
    expect(spans.find(s => s.kind === 'string')).toBeUndefined()
  })

  it('honours SQL doubled-quote escaping', () => {
    const spans = segmentSource("SELECT 'it''s' AS x", SQL)
    expect(spans.find(s => s.kind === 'string')?.text).toBe("'it''s'")
    expect(spans.some(s => s.kind === 'code' && s.text.includes('AS x'))).toBe(true)
  })

  it('honours backslash escaping', () => {
    const spans = segmentSource(`SELECT 'a\\'b' AS x`, SQL)
    expect(spans.find(s => s.kind === 'string')?.text).toBe(`'a\\'b'`)
  })

  it('round-trips: concatenating every span reproduces the input exactly', () => {
    const samples = [
      "SELECT * FROM t WHERE code = 'a--b'",
      "SELECT 1 /* note */ FROM t -- tail",
      `a "double" b 'single' c`,
      "unterminated 'string",
      "unterminated /* comment",
      '',
    ]
    for (const s of samples) {
      expect(segmentSource(s, SQL).map(x => x.text).join('')).toBe(s)
    }
  })

  it('preserves an unterminated literal rather than repairing it', () => {
    const spans = segmentSource("SELECT 'oops", SQL)
    expect(spans.find(s => s.kind === 'string')?.text).toBe("'oops")
  })

  it('matches raw regions ahead of the quoting rules', () => {
    const spans = segmentSource('a url(data:image/svg+xml;base64,AA==) b', {
      quotes: ['"', "'"],
      blockComment: ['/*', '*/'],
      rawRegions: [/url\(\s*[^)'"]*\)/i],
    })
    expect(spans.find(s => s.kind === 'raw')?.text).toBe('url(data:image/svg+xml;base64,AA==)')
  })

  it('does not mutate a caller regex lastIndex across calls', () => {
    const re = /url\(\s*[^)'"]*\)/gi
    const opts = { quotes: ['"'], rawRegions: [re] } as const
    const first = segmentSource('url(a) x', opts)
    const second = segmentSource('url(a) x', opts)
    expect(second.map(s => s.kind)).toEqual(first.map(s => s.kind))
    expect(re.lastIndex).toBe(0)
  })
})

describe('mapCode', () => {
  it('rewrites only code spans', () => {
    const spans = segmentSource("a  b 'c  d' -- e  f", SQL)
    expect(mapCode(spans, code => code.replace(/\s+/g, ' '))).toBe("a b 'c  d' -- e  f")
  })
})
