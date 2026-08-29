import { segmentSource, type Span } from './segment'

export interface CssFormatResult {
  isValid: boolean
  formatted?: string
  error?: string
}

/**
 * An unquoted `url(...)` is a single token: CSS Syntax L3 forbids whitespace
 * inside it, so a formatter that inserts a newline after the `;` of a
 * `data:image/svg+xml;base64,...` URI produces a declaration the browser drops.
 * The quoted form needs no special case — the quote rules already cover it.
 */
const CSS_URL = /url\(\s*[^)'"]*\)/i

const CSS_SPANS = {
  quotes: ['"', "'"],
  blockComment: ['/*', '*/'],
  rawRegions: [CSS_URL],
} as const

const cssSpans = (css: string): Span[] => segmentSource(css, CSS_SPANS)

/**
 * Formats CSS with one declaration per line.
 *
 * Structural characters are only acted on inside `code` spans, so a `{`, `;` or
 * `}` appearing inside a string or a `url()` no longer triggers a line break in
 * the middle of a value.
 */
export const formatCss = (css: string, indent: number = 2): CssFormatResult => {
  if (!css.trim()) {
    return {
      isValid: false,
      error: 'CSS is empty'
    }
  }

  try {
    let formatted = ''
    let indentLevel = 0
    const indentStr = ' '.repeat(indent)
    let inRule = false

    for (const span of cssSpans(css)) {
      if (span.kind !== 'code') {
        formatted += span.text
        continue
      }

      for (const char of span.text) {
        if (char === '{') {
          inRule = true
          indentLevel++
          formatted = formatted.trimEnd() + ' {\n' + indentStr.repeat(indentLevel)
          continue
        }

        if (char === '}') {
          indentLevel = Math.max(0, indentLevel - 1)
          formatted = formatted.trimEnd() + '\n' + indentStr.repeat(indentLevel) + '}'
          inRule = false
          continue
        }

        if (char === ';') {
          formatted = formatted.trimEnd() + ';\n'
          if (inRule) formatted += indentStr.repeat(indentLevel)
          continue
        }

        // Collapse runs of whitespace. Safe here in a way it was not before:
        // this only ever sees a `code` span, so a run inside a string or a
        // url() is unreachable.
        if (/\s/.test(char)) {
          if (formatted && !/\s$/.test(formatted)) formatted += ' '
          continue
        }

        formatted += char
      }
    }

    return {
      isValid: true,
      formatted: formatted.trim()
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'CSS formatting failed'
    }
  }
}

/**
 * Minifies CSS.
 *
 * Two things this deliberately does not do:
 *
 * 1. It never touches a string, comment body, or `url()` — the previous regex
 *    chain applied `/\/\*[\s\S]*?\*\//g` to the whole sheet, so
 *    a `content` string holding comment delimiters lost its entire value, and the
 *    punctuation rules rewrote `content:"a; b"` to `content:"a;b"`.
 *
 * 2. It does not strip whitespace around `+` or `-`. Per CSS Values L3 §8.1
 *    those operators *must* be surrounded by whitespace inside `calc()`, so
 *    `calc(100% + 20px)` → `calc(100%+20px)` is a parse error that costs the
 *    whole declaration. Telling a selector combinator apart from an arithmetic
 *    operator needs a value parser; a few bytes is the cheaper trade.
 */
export const minifyCss = (css: string): CssFormatResult => {
  if (!css.trim()) {
    return {
      isValid: false,
      error: 'CSS is empty'
    }
  }

  try {
    // A dropped comment leaves a space so adjacent tokens cannot fuse; merging
    // neighbouring code lets that space collapse with the surrounding run.
    const spans: Span[] = []
    for (const span of cssSpans(css)) {
      const next: Span = span.kind === 'comment' ? { kind: 'code', text: ' ' } : span
      const prev = spans[spans.length - 1]
      if (prev && prev.kind === 'code' && next.kind === 'code') prev.text += next.text
      else spans.push({ ...next })
    }

    const minified = spans
      .map(span =>
        span.kind === 'code'
          ? span.text
              .replace(/\s+/g, ' ')
              .replace(/\s*([{}:;,>])\s*/g, '$1')
              .replace(/;\}/g, '}')
          : span.text
      )
      .join('')
      .trim()

    return {
      isValid: true,
      formatted: minified
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'CSS minification failed'
    }
  }
}

export const validateCss = (css: string): CssFormatResult => {
  if (!css.trim()) {
    return {
      isValid: false,
      error: 'CSS is empty'
    }
  }

  try {
    let braceCount = 0

    for (const span of cssSpans(css)) {
      if (span.kind !== 'code') continue
      for (const char of span.text) {
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount < 0) {
            return {
              isValid: false,
              error: 'Unmatched closing brace'
            }
          }
        }
      }
    }

    if (braceCount !== 0) {
      return {
        isValid: false,
        error: 'Unmatched braces'
      }
    }

    return {
      isValid: true
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'CSS validation failed'
    }
  }
}
