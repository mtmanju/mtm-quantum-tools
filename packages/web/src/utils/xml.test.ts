import { describe, it, expect } from 'vitest'
import { formatXml, minifyXml } from './xml'
import { scanXml, findMixedContent } from './xmlNodes'

const fmt = (xml: string) => formatXml(xml).formatted
const min = (xml: string) => minifyXml(xml).formatted

/**
 * XML 1.0 makes character data verbatim (§2.10), CDATA sections verbatim
 * (§2.7), and non-CDATA-typed attribute whitespace significant (§3.3.3).
 * Everything here is a case where the old regex-based pair violated one of
 * those on input a user would realistically paste.
 */
describe('minifyXml', () => {
  it('preserves whitespace in mixed content', () => {
    // Previously "<p>foo<b>bar</b>baz</p>" — the rendered words changed.
    expect(min('<p>foo <b>bar</b> baz</p>')).toBe('<p>foo <b>bar</b> baz</p>')
  })

  it('preserves whitespace inside attribute values', () => {
    expect(min('<a href="x  y">t</a>')).toBe('<a href="x  y">t</a>')
  })

  it('preserves a CDATA section byte for byte', () => {
    expect(min('<root><![CDATA[x < y  z]]></root>')).toBe('<root><![CDATA[x < y  z]]></root>')
  })

  it('does not treat a literal > in text as markup', () => {
    expect(min('<a>1 &gt; 2</a>')).toBe('<a>1 &gt; 2</a>')
  })

  it('keeps whitespace that is an element sole child', () => {
    expect(min('<a>  </a>')).toBe('<a>  </a>')
  })

  it('still removes whitespace between elements', () => {
    expect(min('<root>\n  <a>1</a>\n  <b>2</b>\n</root>')).toBe('<root><a>1</a><b>2</b></root>')
  })
})

describe('formatXml', () => {
  it('does not let self-closing tags run the indentation away', () => {
    // Each <br/> used to push a level that never popped, so </root> ended up
    // indented instead of at column 0.
    expect(fmt('<root><br/><br/><x>1</x></root>')).toBe(
      '<root>\n  <br/>\n  <br/>\n  <x>1</x>\n</root>'
    )
  })

  it('emits an element with mixed content verbatim', () => {
    expect(fmt('<p>foo <b>bar</b> baz</p>')).toBe('<p>foo <b>bar</b> baz</p>')
  })

  it('does not indent inside a CDATA section, nor let it shift the depth', () => {
    expect(fmt('<root><![CDATA[x < y  z]]></root>')).toBe(
      '<root>\n  <![CDATA[x < y  z]]>\n</root>'
    )
  })

  it('does not split text on a literal >', () => {
    expect(fmt('<a>1 &gt; 2</a>')).toBe('<a>1 &gt; 2</a>')
  })

  it('keeps a comment at its own depth without shifting siblings', () => {
    expect(fmt('<root><!-- note --><a/></root>')).toBe(
      '<root>\n  <!-- note -->\n  <a/>\n</root>'
    )
  })

  it('puts the XML declaration on its own line', () => {
    expect(fmt('<?xml version="1.0"?><root><a>1</a></root>')).toBe(
      '<?xml version="1.0"?>\n<root>\n  <a>1</a>\n</root>'
    )
  })

  it('reindents an already-indented document idempotently', () => {
    const once = fmt('<root>\n  <a>1</a>\n  <b>2</b>\n</root>')
    expect(fmt(once!)).toBe(once)
  })

  it('reports blank input as invalid', () => {
    expect(formatXml('').isValid).toBe(false)
  })
})

describe('scanXml', () => {
  it('round-trips any input exactly', () => {
    const samples = [
      '<root><a>1</a></root>',
      '<p>foo <b>bar</b> baz</p>',
      '<root><![CDATA[x]]><!-- c --><?pi?></root>',
      '<a title="a>b"/>',
      'not xml at all',
      '<unterminated',
    ]
    for (const s of samples) {
      expect(scanXml(s).map(n => n.text).join('')).toBe(s)
    }
  })

  it('does not end a tag on a > inside an attribute value', () => {
    const nodes = scanXml('<a title="a>b"/>')
    expect(nodes).toHaveLength(1)
    expect(nodes[0].kind).toBe('selfClosing')
  })

  it('classifies each node kind', () => {
    const kinds = scanXml('<?xml?><!-- c --><a><![CDATA[x]]>t</a>').map(n => n.kind)
    expect(kinds).toEqual(['pi', 'comment', 'open', 'cdata', 'text', 'close'])
  })
})

describe('findMixedContent', () => {
  it('flags only elements holding real character data', () => {
    const nodes = scanXml('<root><a>text</a><b><c/></b></root>')
    const mixed = findMixedContent(nodes)
    const openA = nodes.findIndex(n => n.kind === 'open' && n.name === 'a')
    const openB = nodes.findIndex(n => n.kind === 'open' && n.name === 'b')
    expect(mixed.has(openA)).toBe(true)
    expect(mixed.has(openB)).toBe(false)
  })
})
