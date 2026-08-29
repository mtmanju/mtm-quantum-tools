/**
 * A structural scan of XML markup.
 *
 * XML does not fit the code/string model in `segment.ts`: the significant
 * distinction is not "quoted vs unquoted" but "markup vs character data". The
 * previous formatter and minifier both worked by running regexes over the whole
 * document, which is why they rewrote text nodes, attribute values and CDATA
 * bodies — all of which XML 1.0 defines as verbatim content:
 *
 *   §2.4  only `<`, `&` and `]]>` are restricted in character data
 *   §2.7  a CDATA section is passed through unchanged
 *   §2.10 an application must receive all whitespace in character data
 *   §3.3.3 whitespace in a non-CDATA-typed attribute is not collapsed
 *
 * Scanning into nodes lets a formatter reindent the parts that are markup while
 * leaving every byte of content alone.
 */

export type XmlNodeKind =
  | 'open'
  | 'close'
  | 'selfClosing'
  | 'text'
  | 'comment'
  | 'cdata'
  | 'pi'
  | 'doctype'

export interface XmlNode {
  kind: XmlNodeKind
  text: string
  /** Element name, for `open` / `close` / `selfClosing`. */
  name?: string
  start: number
  end: number
}

const DELIMITED: ReadonlyArray<{ open: string; close: string; kind: XmlNodeKind }> = [
  { open: '<!--', close: '-->', kind: 'comment' },
  { open: '<![CDATA[', close: ']]>', kind: 'cdata' },
  { open: '<?', close: '?>', kind: 'pi' },
  { open: '<!DOCTYPE', close: '>', kind: 'doctype' },
  { open: '<!', close: '>', kind: 'doctype' },
]

/**
 * Find the `>` that ends a tag, skipping any inside a quoted attribute value —
 * `<a title="a>b"/>` is one tag, not two.
 */
const findTagEnd = (xml: string, from: number): number => {
  let quote = ''
  for (let i = from; i < xml.length; i++) {
    const ch = xml[i]
    if (quote) {
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '>') return i
  }
  return -1
}

const nameOf = (tag: string): string => tag.replace(/^<\/?/, '').match(/^[^\s/>]+/)?.[0] ?? ''

export const scanXml = (xml: string): XmlNode[] => {
  const nodes: XmlNode[] = []
  let i = 0

  while (i < xml.length) {
    if (xml[i] !== '<') {
      const next = xml.indexOf('<', i)
      const stop = next === -1 ? xml.length : next
      nodes.push({ kind: 'text', text: xml.slice(i, stop), start: i, end: stop })
      i = stop
      continue
    }

    const delimited = DELIMITED.find(d => xml.startsWith(d.open, i))
    if (delimited) {
      const closeAt = xml.indexOf(delimited.close, i + delimited.open.length)
      const stop = closeAt === -1 ? xml.length : closeAt + delimited.close.length
      nodes.push({ kind: delimited.kind, text: xml.slice(i, stop), start: i, end: stop })
      i = stop
      continue
    }

    const tagEnd = findTagEnd(xml, i)
    if (tagEnd === -1) {
      // Unterminated tag: keep the remainder verbatim rather than inventing one.
      nodes.push({ kind: 'text', text: xml.slice(i), start: i, end: xml.length })
      break
    }

    const text = xml.slice(i, tagEnd + 1)
    const kind: XmlNodeKind = text.startsWith('</')
      ? 'close'
      : text.endsWith('/>')
        ? 'selfClosing'
        : 'open'
    nodes.push({ kind, text, name: nameOf(text), start: i, end: tagEnd + 1 })
    i = tagEnd + 1
  }

  return nodes
}

export const isWhitespaceOnly = (node: XmlNode): boolean =>
  node.kind === 'text' && node.text.trim() === ''

/**
 * Indices of `open` nodes whose element holds mixed content — at least one
 * direct child that is non-whitespace character data.
 *
 * Such an element must be emitted exactly as written: reindenting it would move
 * text the document declares significant. `<p>foo <b>bar</b> baz</p>` is the
 * canonical case the old formatter mangled into four lines.
 */
export const findMixedContent = (nodes: readonly XmlNode[]): Set<number> => {
  const mixed = new Set<number>()
  const stack: number[] = []

  nodes.forEach((node, index) => {
    if (node.kind === 'open') {
      stack.push(index)
      return
    }
    if (node.kind === 'close') {
      stack.pop()
      return
    }
    if (node.kind === 'text' && stack.length) {
      const parent = stack[stack.length - 1]
      // Whitespace that is an element's only child is its value, not layout, so
      // that element is emitted verbatim too: `<a>  </a>` must not lose it.
      const soleChild = parent === index - 1 && nodes[index + 1]?.kind === 'close'
      if (node.text.trim() !== '' || soleChild) mixed.add(parent)
    }
  })

  return mixed
}

/** Index of the `close` node matching the `open` at `openIndex`, or -1. */
export const matchingClose = (nodes: readonly XmlNode[], openIndex: number): number => {
  let depth = 0
  for (let i = openIndex; i < nodes.length; i++) {
    if (nodes[i].kind === 'open') depth++
    else if (nodes[i].kind === 'close') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}
