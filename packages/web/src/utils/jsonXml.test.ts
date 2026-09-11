// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { jsonToXml, xmlToJson } from './jsonXml'

const xml = (json: string, root?: string) => jsonToXml(json, root).converted ?? ''
const body = (json: string, root?: string) => xml(json, root).split('\n').slice(1).join('\n')
const json = (source: string) => {
  const result = xmlToJson(source)
  expect(result.isValid).toBe(true)
  return JSON.parse(result.converted ?? 'null')
}

describe('xmlToJson', () => {
  it('rejects empty input', () => {
    expect(xmlToJson('  ').isValid).toBe(false)
  })

  it('keeps a text-only leaf as a string', () => {
    expect(json('<root><name>Ada</name></root>')).toEqual({ name: 'Ada' })
  })

  // Previously dropped without a word of warning.
  it('preserves attributes', () => {
    expect(json('<root><user id="7" role="admin">Ada</user></root>')).toEqual({
      user: { '@id': '7', '@role': 'admin', '#text': 'Ada' },
    })
  })

  it('preserves attributes on the root element', () => {
    expect(json('<root version="2"><a>1</a></root>')).toEqual({ '@version': '2', a: '1' })
  })

  it('preserves text alongside child elements', () => {
    expect(json('<root>hello <b>world</b></root>')).toEqual({ b: 'world', '#text': 'hello ' })
  })

  it('does not invent #text from pretty-printing whitespace', () => {
    expect(json('<root>\n  <a>1</a>\n  <b>2</b>\n</root>')).toEqual({ a: '1', b: '2' })
  })

  // CDATA is handled in convertXmlToObject, but happy-dom's XML parser rejects
  // a CDATA section outright ("StartTag: invalid element name"), so there is no
  // way to exercise it here — it is checked against a real browser instead.

  it('collapses repeated siblings into an array', () => {
    expect(json('<root><i>1</i><i>2</i><i>3</i></root>')).toEqual({ i: ['1', '2', '3'] })
  })

  it('keeps an empty element as an empty string', () => {
    expect(json('<root><a></a></root>')).toEqual({ a: '' })
  })

  it('reports malformed XML rather than throwing', () => {
    const result = xmlToJson('<root><a></root>')
    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('jsonToXml', () => {
  it('rejects empty input', () => {
    expect(jsonToXml('   ').isValid).toBe(false)
  })

  it('reports invalid JSON rather than throwing', () => {
    expect(jsonToXml('{oops').isValid).toBe(false)
  })

  it('emits a declaration and a single root', () => {
    expect(xml('{"a":1}')).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <a>1</a>\n</root>')
  })

  // Previously emitted two document elements, which no parser will read back.
  it('wraps a top-level array in the root element', () => {
    expect(body('[1,2]')).toBe('<root>\n  <item>1</item>\n  <item>2</item>\n</root>')
    expect(xmlToJson(body('[1,2]')).isValid).toBe(true)
  })

  it('repeats an element per array member', () => {
    expect(body('{"i":[1,2]}')).toBe('<root>\n  <i>1</i>\n  <i>2</i>\n</root>')
  })

  it('wraps nested arrays so the nesting survives', () => {
    expect(body('{"i":[[1,2]]}')).toBe(
      '<root>\n  <i>\n    <item>1</item>\n    <item>2</item>\n  </i>\n</root>'
    )
  })

  // `<123>` is not a legal element name however friendly it looks.
  it('makes a numeric key into a legal element name', () => {
    expect(body('{"123":"x"}')).toContain('<_123>x</_123>')
    expect(xmlToJson(body('{"123":"x"}')).isValid).toBe(true)
  })

  it('keeps hyphens and dots, which XML names allow', () => {
    expect(body('{"foo-bar.baz":1}')).toContain('<foo-bar.baz>1</foo-bar.baz>')
  })

  it('sanitises the root element name too', () => {
    expect(body('{"a":1}', '9 bad')).toContain('<_9_bad>')
  })

  it('writes @-prefixed keys as attributes and #text as content', () => {
    expect(body('{"user":{"@id":"7","#text":"Ada"}}')).toBe(
      '<root>\n  <user id="7">Ada</user>\n</root>'
    )
  })

  it('escapes markup characters in text and attributes', () => {
    expect(body('{"a":"1 < 2 & 3"}')).toContain('<a>1 &lt; 2 &amp; 3</a>')
    expect(body('{"a":{"@t":"say \\"hi\\"\\n"}}')).toContain('t="say &quot;hi&quot;&#10;"')
  })

  it('drops characters XML cannot represent at all', () => {
    const out = body('{"a":"x\\u0000y"}')
    expect(out).toContain('<a>xy</a>')
    expect(xmlToJson(out).isValid).toBe(true)
  })

  it('writes null as an empty element', () => {
    expect(body('{"a":null}')).toContain('<a></a>')
  })

  it('round-trips attributes, text, nesting and repetition', () => {
    const source =
      '<root version="2">\n  <user id="7">Ada</user>\n  <user id="8">Grace</user>\n</root>'
    const asJson = xmlToJson(source).converted ?? ''
    const backToXml = body(asJson)
    expect(xmlToJson(backToXml).converted).toBe(asJson)
  })
})
