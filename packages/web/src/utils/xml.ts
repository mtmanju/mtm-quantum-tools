import { scanXml, isWhitespaceOnly, findMixedContent, matchingClose } from './xmlNodes'

export interface XmlFormatResult {
  isValid: boolean
  formatted?: string
  error?: string
}

export const formatXml = (xml: string, indent: number = 2): XmlFormatResult => {
  if (!xml.trim()) {
    return {
      isValid: false,
      error: 'XML content is empty'
    }
  }
  
  try {
    const formatted = formatXmlString(xml, indent)
    return {
      isValid: true,
      formatted
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to format XML'
    }
  }
}

export const minifyXml = (xml: string): XmlFormatResult => {
  if (!xml.trim()) {
    return {
      isValid: false,
      error: 'XML content is empty'
    }
  }
  
  try {
    /**
     * Only whitespace *between* elements is removable. The previous regexes ran
     * over the whole document, so they collapsed runs inside attribute values
     * and CDATA bodies and deleted the spaces around a literal `>` in text —
     * `<p>foo <b>bar</b> baz</p>` came back as `<p>foo<b>bar</b>baz</p>`, which
     * renders as different words.
     *
     * Whitespace that is an element's only child is content, not layout, so it
     * is kept: `<a>  </a>` has a value and `<a></a>` does not.
     */
    const nodes = scanXml(xml)
    const minified = nodes
      .map((node, i) => {
        if (!isWhitespaceOnly(node)) return node.text
        const onlyChild = nodes[i - 1]?.kind === 'open' && nodes[i + 1]?.kind === 'close'
        return onlyChild ? node.text : ''
      })
      .join('')
      .trim()

    return {
      isValid: true,
      formatted: minified
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to minify XML'
    }
  }
}

export const validateXml = (xml: string): XmlFormatResult => {
  if (!xml.trim()) {
    return {
      isValid: false,
      error: 'XML content is empty'
    }
  }
  
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const parseError = doc.querySelector('parsererror')
    
    if (parseError) {
      return {
        isValid: false,
        error: parseError.textContent || 'XML parsing error'
      }
    }
    
    return {
      isValid: true
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid XML format'
    }
  }
}

/**
 * Reindents element structure without touching character data.
 *
 * The previous implementation incremented its depth counter for every `<` not
 * followed by `/` or `?`, so `<br/>`, comments and CDATA all pushed the
 * indentation one level deeper and never popped it — a document of self-closing
 * tags walked steadily to the right and its closing tag landed at the wrong
 * depth. It also inserted a newline after any `>` not immediately followed by
 * `<`, which put line breaks and indentation *inside* text nodes, and treated a
 * literal `>` in content as a tag terminator.
 *
 * An element holding mixed content is emitted exactly as it was written; only
 * elements whose children are all markup get reindented.
 */
const formatXmlString = (xml: string, indent: number): string => {
  const nodes = scanXml(xml)
  const mixed = findMixedContent(nodes)
  const indentStr = ' '.repeat(indent)
  const lines: string[] = []
  let depth = 0

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    // Whitespace between elements is layout, not content — it is what we are
    // replacing. Text inside a mixed element never reaches here.
    if (isWhitespaceOnly(node)) continue

    if (node.kind === 'open' && mixed.has(i)) {
      const close = matchingClose(nodes, i)
      const end = close === -1 ? nodes[nodes.length - 1].end : nodes[close].end
      lines.push(indentStr.repeat(depth) + xml.slice(node.start, end))
      i = close === -1 ? nodes.length : close
      continue
    }

    if (node.kind === 'close') {
      depth = Math.max(0, depth - 1)
      lines.push(indentStr.repeat(depth) + node.text)
      continue
    }

    lines.push(indentStr.repeat(depth) + node.text)

    // Only a real element opens a level: self-closing tags, comments, CDATA,
    // processing instructions and the doctype all close themselves.
    if (node.kind === 'open') depth++
  }

  return lines.join('\n').trim()
}

