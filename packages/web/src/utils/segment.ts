/**
 * Split a source string into spans that may be rewritten and spans that must
 * not be.
 *
 * Every formatter in this codebase that was written as a chain of `.replace()`
 * calls has corrupted user data, because a regex cannot know whether the text
 * it matched is code or content. The JS minifier deleted the rest of any line
 * containing a URL (`//` read as a comment); the HTML minifier collapsed
 * `<pre>` bodies and joined words in visible prose; the SQL minifier deletes
 * everything after a `--` that happens to sit inside a string literal; the CSS
 * minifier eats a declaration whose string contains `/*`.
 *
 * They are all one bug. The fix is to scan once, mark the regions where the
 * language's own quoting and commenting rules say the text is *content*, and
 * let each formatter transform only the `code` spans. A span-based pass cannot
 * reach inside a string literal by construction, which is the property the
 * regex chains could never have.
 *
 * This is the same scanner idea as `minifyJsSource`, generalised so SQL and CSS
 * share it rather than each growing their own copy.
 */

export type SpanKind = 'code' | 'string' | 'comment' | 'raw'

export interface Span {
  kind: SpanKind
  text: string
}

export interface SegmentOptions {
  /** Characters that open (and close) a string literal. */
  quotes?: readonly string[]
  /** Treat `\x` inside a string as a two-character escape. */
  backslashEscapes?: boolean
  /** Treat a doubled quote inside a string as one literal quote (SQL's `''`). */
  doubledQuoteEscapes?: boolean
  /** Comment that runs to end of line, e.g. `--` or `//`. */
  lineComment?: string
  /** Delimited comment, given as an open/close pair — C-style, HTML, and so on. */
  blockComment?: readonly [string, string]
  /**
   * Verbatim regions the language defines outside its quoting rules — CSS's
   * unquoted `url(...)`, for example, where a newline is a syntax error.
   * Tested anchored at the current offset, so anchors are unnecessary.
   */
  rawRegions?: readonly RegExp[]
}

/**
 * Sticky clones, so a caller's regex can be reused without us mutating its
 * `lastIndex` (the classic reused-/g/ bug) or recompiling on every character.
 */
const stickyCache = new WeakMap<RegExp, RegExp>()

const asSticky = (re: RegExp): RegExp => {
  let s = stickyCache.get(re)
  if (!s) {
    s = new RegExp(re.source, re.flags.replace(/[gy]/g, '') + 'y')
    stickyCache.set(re, s)
  }
  return s
}

export const segmentSource = (source: string, opts: SegmentOptions): Span[] => {
  const {
    quotes = [],
    backslashEscapes = true,
    doubledQuoteEscapes = false,
    lineComment,
    blockComment,
    rawRegions = [],
  } = opts

  const spans: Span[] = []
  let code = ''
  const flushCode = () => {
    if (code) {
      spans.push({ kind: 'code', text: code })
      code = ''
    }
  }

  let i = 0
  outer: while (i < source.length) {
    for (const re of rawRegions) {
      const sticky = asSticky(re)
      sticky.lastIndex = i
      const m = sticky.exec(source)
      if (m && m[0]) {
        flushCode()
        spans.push({ kind: 'raw', text: m[0] })
        i += m[0].length
        continue outer
      }
    }

    if (blockComment && source.startsWith(blockComment[0], i)) {
      flushCode()
      const end = source.indexOf(blockComment[1], i + blockComment[0].length)
      // Unterminated: take the rest verbatim rather than dropping it.
      const stop = end === -1 ? source.length : end + blockComment[1].length
      spans.push({ kind: 'comment', text: source.slice(i, stop) })
      i = stop
      continue
    }

    if (lineComment && source.startsWith(lineComment, i)) {
      flushCode()
      const nl = source.indexOf('\n', i)
      const stop = nl === -1 ? source.length : nl
      spans.push({ kind: 'comment', text: source.slice(i, stop) })
      i = stop
      continue
    }

    const quote = quotes.find(q => source.startsWith(q, i))
    if (quote) {
      flushCode()
      let text = quote
      let j = i + quote.length
      while (j < source.length) {
        const ch = source[j]
        if (backslashEscapes && ch === '\\') {
          text += ch + (source[j + 1] ?? '')
          j += 2
          continue
        }
        if (source.startsWith(quote, j)) {
          if (doubledQuoteEscapes && source.startsWith(quote, j + quote.length)) {
            text += quote + quote
            j += quote.length * 2
            continue
          }
          text += quote
          j += quote.length
          break
        }
        text += ch
        j++
      }
      // An unterminated literal keeps whatever it swallowed: a formatter must
      // never silently repair input it cannot parse.
      spans.push({ kind: 'string', text })
      i = j
      continue
    }

    code += source[i]
    i++
  }

  flushCode()
  return spans
}

/** Rewrite only the `code` spans, leaving strings, comments and raw regions intact. */
export const mapCode = (spans: readonly Span[], fn: (code: string) => string): string =>
  spans.map(s => (s.kind === 'code' ? fn(s.text) : s.text)).join('')
