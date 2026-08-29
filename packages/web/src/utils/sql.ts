/**
 * SQL formatting utilities
 */

import { segmentSource, type Span } from './segment'

/**
 * How SQL quotes and comments.
 *
 * Both escape conventions are enabled: standard SQL doubles a quote to embed
 * it (`'it''s'`), while MySQL/PostgreSQL-with-escapes also accept `\'`. A
 * literal ending in a lone backslash is mis-scanned under this combination,
 * which is by a wide margin the rarer input, and `validateSql` below already
 * assumes backslash escaping — so the two agree.
 */
const SQL_SPANS = {
  quotes: ["'", '"', '`'],
  backslashEscapes: true,
  doubledQuoteEscapes: true,
  lineComment: '--',
  blockComment: ['/*', '*/'],
} as const

const sqlSpans = (sql: string): Span[] => segmentSource(sql, SQL_SPANS)

interface SqlToken {
  text: string
  /** A string literal or comment: never reflowed, never read as a keyword. */
  opaque: boolean
  /** A `--` comment, which would swallow anything placed after it on its line. */
  lineComment: boolean
  /** No whitespace separated this token from the previous one in the source. */
  glue: boolean
}

const tokenizeSql = (sql: string): SqlToken[] => {
  const tokens: SqlToken[] = []
  let pendingSpace = false

  const push = (text: string, opaque: boolean, lineComment = false) => {
    tokens.push({ text, opaque, lineComment, glue: tokens.length > 0 && !pendingSpace })
    pendingSpace = false
  }

  for (const span of sqlSpans(sql)) {
    if (span.kind === 'string') {
      push(span.text, true)
      continue
    }
    if (span.kind === 'comment') {
      push(span.text, true, span.text.startsWith('--'))
      continue
    }
    // `;` is split out so statements can be separated without deleting it.
    for (const piece of span.text.match(/\s+|;|[^\s;]+/g) ?? []) {
      if (/^\s+$/.test(piece)) {
        pendingSpace = true
        continue
      }
      push(piece, false)
    }
  }

  return tokens
}

const INDENTING_CLAUSES = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP', 'ORDER', 'HAVING']
const CLAUSES = [
  ...INDENTING_CLAUSES,
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'ALTER',
  'DROP',
]

/**
 * Formats SQL query with proper indentation.
 *
 * Reflows only the `code` spans. Previously this ran over the raw string, so a
 * literal containing a keyword (`WHERE s = 'x select y'`) was broken across
 * lines and re-indented *inside the quotes*, and a literal containing `;` was
 * treated as a statement boundary — which deleted the character and split the
 * string in half. Statement terminators are now preserved rather than dropped,
 * so a multi-statement script still parses after formatting.
 */
export const formatSql = (sql: string): string => {
  if (!sql.trim()) return ''

  const tokens = tokenizeSql(sql)
  const lines: string[] = []
  const indentSize = 2
  let indentLevel = 0
  let currentLine = ''
  let pendingBlankLine = false

  const emit = (text: string) => {
    if (pendingBlankLine && lines.length) lines.push('')
    pendingBlankLine = false
    lines.push(text)
  }

  const flush = () => {
    if (currentLine.trim()) {
      emit(' '.repeat(indentLevel * indentSize) + currentLine.trim())
      currentLine = ''
    }
  }

  const append = (token: SqlToken) => {
    currentLine += currentLine && !token.glue ? ' ' + token.text : token.text
  }

  for (const token of tokens) {
    if (token.lineComment) {
      // Anything reflowed onto the same line after this would be commented out.
      flush()
      emit(' '.repeat(indentLevel * indentSize) + token.text)
      continue
    }

    if (token.opaque) {
      append(token)
      continue
    }

    if (token.text === ';') {
      currentLine += ';'
      flush()
      indentLevel = 0
      pendingBlankLine = true
      continue
    }

    const upper = token.text.toUpperCase()

    if (CLAUSES.includes(upper)) {
      flush()
      emit(' '.repeat(indentLevel * indentSize) + token.text)
      if (INDENTING_CLAUSES.includes(upper)) indentLevel++
      continue
    }

    if (upper === 'ON' && indentLevel > 0) {
      flush()
      indentLevel--
      emit(' '.repeat(indentLevel * indentSize) + token.text)
      indentLevel++
      continue
    }

    if (token.text.endsWith(',')) {
      append(token)
      if (indentLevel > 0) flush()
      continue
    }

    append(token)
  }

  flush()

  return lines.join('\n').trim() || sql.trim()
}

/**
 * Minifies SQL query (removes extra whitespace and comments).
 *
 * Whitespace is collapsed per `code` span. The previous implementation applied
 * `/--.*$/gm` to the whole query, so `WHERE code = 'a--b'` lost everything from
 * the `--` onwards and returned a query with an unterminated quote — silent,
 * unrecoverable data loss on input the tool reported as successfully minified.
 */
export const minifySql = (sql: string): string => {
  if (!sql.trim()) return ''

  // A removed comment leaves a space behind: `SELECT/*x*/1` must not fuse into
  // `SELECT1`. Adjacent code is merged so the space collapses with its
  // neighbours instead of surviving as a run.
  const spans: Span[] = []
  for (const span of sqlSpans(sql)) {
    const next: Span = span.kind === 'comment' ? { kind: 'code', text: ' ' } : span
    const prev = spans[spans.length - 1]
    if (prev && prev.kind === 'code' && next.kind === 'code') prev.text += next.text
    else spans.push({ ...next })
  }

  return spans
    .map(span =>
      span.kind === 'code'
        ? span.text
            .replace(/\s+/g, ' ')
            // Only `,` and `;` are stripped on both sides — they are pure
            // delimiters. For parens just the inside is closed up, so
            // `COUNT( * ) FROM` becomes `COUNT(*) FROM` and not `COUNT(*)FROM`:
            // the latter parses, but fusing a paren onto an adjacent keyword is
            // the same over-reach that produced every other bug in this file.
            .replace(/\s*([,;])\s*/g, '$1')
            .replace(/\(\s+/g, '(')
            .replace(/\s+\)/g, ')')
        : span.text
    )
    .join('')
    .trim()
}

/**
 * Validates basic SQL syntax
 */
export const validateSql = (sql: string): { isValid: boolean; error?: string } => {
  if (!sql.trim()) {
    return {
      isValid: false,
      error: 'Please enter SQL query'
    }
  }

  // Basic validation - check for balanced parentheses and quotes
  // Need to account for escaped quotes and comments
  let openParens = 0
  let closeParens = 0
  let singleQuotes = 0
  let doubleQuotes = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inComment = false
  let commentType = ''

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const nextChar = sql[i + 1]
    const prevChar = sql[i - 1]

    // Handle comments
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '-' && nextChar === '-' && !inComment) {
        inComment = true
        commentType = '--'
        i++
        continue
      }
      if (char === '/' && nextChar === '*' && !inComment) {
        inComment = true
        commentType = '/*'
        i++
        continue
      }
      if (inComment && commentType === '/*' && char === '*' && nextChar === '/') {
        inComment = false
        i++
        continue
      }
      if (inComment && commentType === '--' && char === '\n') {
        inComment = false
        continue
      }
      if (inComment) continue
    }

    // Handle quotes (account for escaped quotes)
    if (!inComment) {
      if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote
        singleQuotes++
      } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote
        doubleQuotes++
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') openParens++
        else if (char === ')') closeParens++
      }
    }
  }

  if (openParens !== closeParens) {
    return {
      isValid: false,
      error: 'Unbalanced parentheses'
    }
  }

  if (singleQuotes % 2 !== 0) {
    return {
      isValid: false,
      error: 'Unbalanced single quotes'
    }
  }

  if (doubleQuotes % 2 !== 0) {
    return {
      isValid: false,
      error: 'Unbalanced double quotes'
    }
  }

  return {
    isValid: true
  }
}
