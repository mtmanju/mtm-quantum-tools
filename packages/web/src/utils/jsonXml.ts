/**
 * Anything `JSON.parse` can produce. Recursive, so it models nested objects
 * and arrays without falling back to `any`.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface JsonXmlResult {
  isValid: boolean
  converted?: string
  error?: string
}

/**
 * How XML features that have no JSON equivalent are spelled in the JSON.
 *
 * Attributes and mixed-content text used to be dropped on the floor:
 * `<user id="7">Ada</user>` converted to `"Ada"` and the id was simply gone,
 * with no error and nothing in the output hinting anything had been discarded.
 * These two prefixes — the convention shared by xml2js, fast-xml-parser and
 * friends — give both somewhere to live, and let the two directions
 * round-trip.
 */
const ATTRIBUTE_PREFIX = '@'
const TEXT_KEY = '#text'

/** Name given to array members that have no key of their own to take. */
const ITEM_NAME = 'item'

/** DOM node types, spelled out so this does not depend on a global `Node`. */
const TEXT_NODE = 3
const CDATA_SECTION_NODE = 4

/**
 * Characters XML 1.0 section 2.2 does not permit at all. They cannot be
 * escaped — a numeric reference to NUL is exactly as illegal as a literal one
 * — so the only options are to drop them or to emit a document no parser will
 * read back.
 */
// eslint-disable-next-line no-control-regex
const ILLEGAL_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

const escapeText = (value: string): string =>
  value
    .replace(ILLEGAL_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const escapeAttribute = (value: string): string =>
  escapeText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Whitespace in an attribute is normalised to a plain space by every
    // parser on the way back in, so it has to be written as a reference to
    // survive a round trip.
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;')
    .replace(/\t/g, '&#9;')

/**
 * Coerces a JSON key into a usable XML element name.
 *
 * The previous version replaced everything outside `[A-Za-z0-9_]`, which both
 * mangled legal names (`foo-bar` became `foo_bar`) and still produced illegal
 * ones: a key of `123` passed through untouched, and `<123>` is not a well
 * formed element name — XML requires a letter or underscore first.
 */
const toElementName = (raw: string): string => {
  const cleaned = raw.replace(/[^A-Za-z0-9_.-]/g, '_')
  if (!cleaned) return ITEM_NAME
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`
}

const isPlainObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const indentOf = (depth: number) => '  '.repeat(depth)

/** Renders `value` as one or more sibling elements named `name`. */
const renderValue = (name: string, value: JsonValue | undefined, depth: number): string[] => {
  const pad = indentOf(depth)

  if (value === null || value === undefined) {
    return [`${pad}<${name}></${name}>`]
  }

  if (Array.isArray(value)) {
    // A list becomes repeated siblings, which is what xmlToJson collapses back
    // into an array. A list *of lists* has no such spelling, so the inner one
    // gets a wrapper element to keep its nesting.
    return value.flatMap(item =>
      Array.isArray(item)
        ? [
            `${pad}<${name}>`,
            ...item.flatMap(inner => renderValue(ITEM_NAME, inner, depth + 1)),
            `${pad}</${name}>`,
          ]
        : renderValue(name, item, depth)
    )
  }

  if (!isPlainObject(value)) {
    return [`${pad}<${name}>${escapeText(String(value))}</${name}>`]
  }

  const attributes: string[] = []
  const children: [string, JsonValue][] = []
  let text: string | null = null

  for (const [key, child] of Object.entries(value)) {
    if (key === TEXT_KEY) {
      text = child === null ? '' : String(child)
    } else if (key.startsWith(ATTRIBUTE_PREFIX)) {
      const attrName = toElementName(key.slice(ATTRIBUTE_PREFIX.length))
      attributes.push(`${attrName}="${escapeAttribute(child === null ? '' : String(child))}"`)
    } else {
      children.push([toElementName(key), child])
    }
  }

  const open = attributes.length ? `<${name} ${attributes.join(' ')}>` : `<${name}>`

  if (children.length === 0) {
    return [`${pad}${open}${escapeText(text ?? '')}</${name}>`]
  }

  const lines = [`${pad}${open}`]
  if (text) lines.push(`${indentOf(depth + 1)}${escapeText(text)}`)
  for (const [key, child] of children) lines.push(...renderValue(key, child, depth + 1))
  lines.push(`${pad}</${name}>`)
  return lines
}

export const jsonToXml = (json: string, rootElement: string = 'root'): JsonXmlResult => {
  if (!json.trim()) {
    return { isValid: false, error: 'JSON is empty' }
  }

  try {
    const parsed: JsonValue = JSON.parse(json)
    const root = toElementName(rootElement)

    /**
     * A top-level array needs the root to wrap it, not to repeat.
     *
     * Repeating produced `<root_item>1</root_item><root_item>2</root_item>` —
     * two document elements, which is not a well formed XML document. Every
     * parser rejects it, so converting a JSON array produced output that could
     * not be converted back.
     */
    const lines = Array.isArray(parsed)
      ? [
          `<${root}>`,
          ...parsed.flatMap(item => renderValue(ITEM_NAME, item, 1)),
          `</${root}>`,
        ]
      : renderValue(root, parsed, 0)

    return {
      isValid: true,
      converted: `<?xml version="1.0" encoding="UTF-8"?>\n${lines.join('\n')}`,
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format',
    }
  }
}

/**
 * Concatenates an element's own text, skipping the whitespace between child
 * elements — otherwise every pretty-printed document gains a `#text` of
 * newlines and spaces on each branch.
 */
const directText = (node: Element): string => {
  let text = ''
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== TEXT_NODE && child.nodeType !== CDATA_SECTION_NODE) continue
    const value = child.nodeValue ?? ''
    if (value.trim()) text += value
  }
  return text
}

const convertXmlToObject = (node: Element): JsonValue => {
  const children = Array.from(node.children)
  const attributes = Array.from(node.attributes)

  // A leaf with nothing to record but its text stays a plain string, which is
  // both the friendlier shape and what this converter has always produced.
  if (children.length === 0 && attributes.length === 0) {
    return node.textContent || ''
  }

  const obj: { [key: string]: JsonValue } = {}

  for (const attr of attributes) {
    obj[`${ATTRIBUTE_PREFIX}${attr.name}`] = attr.value
  }

  for (const child of children) {
    const key = child.tagName
    const value = convertXmlToObject(child)
    const existing = obj[key]

    if (existing === undefined) {
      obj[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      obj[key] = [existing, value]
    }
  }

  const text = directText(node)
  if (text) obj[TEXT_KEY] = text

  return obj
}

export const xmlToJson = (xml: string): JsonXmlResult => {
  if (!xml.trim()) {
    return { isValid: false, error: 'XML is empty' }
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const parseError = doc.querySelector('parsererror')

    if (parseError) {
      return {
        isValid: false,
        error: (parseError.textContent || 'XML parsing error').split('\n')[0],
      }
    }

    const root = doc.documentElement
    if (!root) {
      return { isValid: false, error: 'XML has no root element' }
    }

    return {
      isValid: true,
      converted: JSON.stringify(convertXmlToObject(root), null, 2),
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'XML to JSON conversion failed',
    }
  }
}
