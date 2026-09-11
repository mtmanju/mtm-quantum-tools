/**
 * YAML formatting and validation.
 *
 * Both functions delegate to a real YAML 1.2 parser. The hand-rolled versions
 * they replace could not be made correct: validation walked the text line by
 * line looking for a colon, so it accepted `a: "unclosed`, `a: [1,2` and
 * duplicate keys as valid, while rejecting perfectly legal three-space
 * indentation; formatting re-indented from a running counter, which silently
 * destroyed block scalars, nested sequences and anything multi-line. Neither
 * is patchable — you cannot decide whether a quote is closed without tracking
 * the state the parser tracks.
 */
import { parseAllDocuments, type Document } from 'yaml'

export interface YamlValidation {
  isValid: boolean
  error?: string
}

/** YAML requires at least one space of indentation; more than eight is unusable. */
const MIN_INDENT = 1
const MAX_INDENT = 8

/**
 * The parser's messages carry the offending source line and a caret beneath
 * it, which is excellent in a terminal and far too tall for a one-line error
 * bar. Keep the sentence and attach the position ourselves.
 */
function describe(docs: Document[]): string | undefined {
  for (const doc of docs) {
    const [error] = doc.errors
    if (!error) continue
    const sentence = error.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '')
    const line = error.linePos?.[0]
    return line ? `Line ${line.line}: ${sentence}` : sentence
  }
  return undefined
}

function parse(yaml: string): Document[] {
  // uniqueKeys is the parser's default, but it is the whole reason duplicate
  // keys are caught here rather than silently overwriting one another, so it
  // is worth stating rather than inheriting.
  return parseAllDocuments(yaml, { uniqueKeys: true })
}

/**
 * Re-emits YAML at the requested indentation.
 *
 * Comments survive, because the document is round-tripped through the parser's
 * CST rather than re-serialised from plain values. Invalid input yields an
 * empty string — callers gate on {@link validateYaml} and show its error
 * instead.
 */
export const formatYaml = (yaml: string, indentSize: number = 2): string => {
  if (!yaml.trim()) return ''

  const indent = Math.min(MAX_INDENT, Math.max(MIN_INDENT, Math.floor(indentSize) || 2))

  try {
    const docs = parse(yaml)
    if (docs.some(doc => doc.errors.length > 0)) return ''
    return docs.map(doc => doc.toString({ indent })).join('')
  } catch {
    // A failure the document-level errors did not describe (an unsupported
    // tag, a stringify overflow). Falling back to empty keeps the caller's
    // "show the original" branch rather than emitting something corrupt.
    return ''
  }
}

/**
 * Reports the first structural error in a YAML document, or its absence.
 */
export const validateYaml = (yaml: string): YamlValidation => {
  if (!yaml.trim()) {
    return { isValid: false, error: 'Please enter YAML content' }
  }

  try {
    const error = describe(parse(yaml))
    return error ? { isValid: false, error } : { isValid: true }
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : 'Invalid YAML',
    }
  }
}
