export interface JsFormatResult {
  isValid: boolean
  formatted?: string
  error?: string
}

export const formatJavaScript = (js: string, indent: number = 2): JsFormatResult => {
  if (!js.trim()) {
    return {
      isValid: false,
      error: 'JavaScript is empty'
    }
  }

  try {
    // Basic JavaScript formatting
    let formatted = ''
    let indentLevel = 0
    const indentStr = ' '.repeat(indent)
    let inString = false
    let stringChar = ''
    let inComment = false
    let commentType = ''

    for (let i = 0; i < js.length; i++) {
      const char = js[i]
      const nextChar = js[i + 1]
      const prevChar = js[i - 1]

      if (inComment) {
        formatted += char
        if (commentType === '//' && char === '\n') {
          inComment = false
        } else if (commentType === '/*' && char === '*' && nextChar === '/') {
          inComment = false
          formatted += nextChar
          i++
        }
        continue
      }

      if (inString) {
        formatted += char
        if (char === stringChar && prevChar !== '\\') {
          inString = false
        }
        continue
      }

      if (char === '/' && nextChar === '/') {
        inComment = true
        commentType = '//'
        formatted += char
        continue
      }

      if (char === '/' && nextChar === '*') {
        inComment = true
        commentType = '/*'
        formatted += char
        continue
      }

      if (char === '"' || char === "'" || char === '`') {
        inString = true
        stringChar = char
        formatted += char
        continue
      }

      if (char === '{' || char === '[') {
        formatted += char + '\n'
        indentLevel++
        formatted += indentStr.repeat(indentLevel)
        continue
      }

      if (char === '}' || char === ']') {
        indentLevel = Math.max(0, indentLevel - 1)
        formatted += '\n' + indentStr.repeat(indentLevel) + char
        continue
      }

      if (char === ';') {
        formatted += ';\n'
        formatted += indentStr.repeat(indentLevel)
        continue
      }

      if (char === ',') {
        formatted += ', '
        continue
      }

      if (char === '\n' || char === '\r') {
        continue
      }

      formatted += char
    }

    return {
      isValid: true,
      formatted: formatted.trim()
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'JavaScript formatting failed'
    }
  }
}

/**
 * Minify by scanning, not by pattern-matching.
 *
 * This replaces a chain of ~20 blind `.replace()` calls that had no idea what
 * a string literal was. `const s = "a  b"` minified to `const s="a b"` — the
 * double space *inside the string* was collapsed, silently changing the
 * program's data. `/a  b/` became `/a  b/` -> `/a b/`, changing what the
 * regex matches. And because `//.*` was stripped blindly, any string
 * containing `//` — every URL in the file — was truncated from that point to
 * the end of the line.
 *
 * Whitespace can only be collapsed in code, so the minifier has to know where
 * the code is. This walks the source tracking whether it is inside a string,
 * template literal, regex literal or comment, and copies those regions
 * through byte for byte.
 */
const minifyJsSource = (js: string): string => {
  let out = ''
  let i = 0

  /** Last non-space character emitted — decides regex vs division below. */
  const lastCode = () => {
    for (let k = out.length - 1; k >= 0; k--) {
      if (!/\s/.test(out[k])) return out[k]
    }
    return ''
  }

  /**
   * A `/` opens a regex unless the previous token can end an expression.
   * After an identifier, number, `)` or `]` it is division; otherwise it
   * starts a literal. This is the standard heuristic and it is why the old
   * approach could never have been made correct with regexes alone.
   */
  const slashStartsRegex = () => {
    const c = lastCode()
    return c === '' || !/[\w$)\]]/.test(c)
  }

  const copyDelimited = (close: string, allowEscapes = true) => {
    out += js[i++]
    while (i < js.length) {
      const ch = js[i]
      if (allowEscapes && ch === '\\') { out += ch + (js[i + 1] ?? ''); i += 2; continue }
      out += ch
      i++
      if (ch === close) return
    }
  }

  while (i < js.length) {
    const ch = js[i]
    const next = js[i + 1]

    // Comments — dropped entirely.
    if (ch === '/' && next === '/') {
      while (i < js.length && js[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < js.length && !(js[i] === '*' && js[i + 1] === '/')) i++
      i += 2
      continue
    }

    // Literals — copied verbatim.
    if (ch === '"' || ch === "'") { copyDelimited(ch); continue }
    if (ch === '`') {
      // Template literals may nest ${ ... }, which is code; keeping the whole
      // literal verbatim is correct and costs only the interpolation's
      // whitespace.
      copyDelimited('`')
      continue
    }
    if (ch === '/' && slashStartsRegex()) {
      out += js[i++]
      let inClass = false
      while (i < js.length) {
        const c = js[i]
        if (c === '\\') { out += c + (js[i + 1] ?? ''); i += 2; continue }
        if (c === '[') inClass = true
        else if (c === ']') inClass = false
        else if (c === '/' && !inClass) { out += c; i++; break }
        else if (c === '\n') break
        out += c
        i++
      }
      // Trailing flags.
      while (i < js.length && /[a-z]/i.test(js[i])) out += js[i++]
      continue
    }

    // Code — collapse runs of whitespace to a single space, then drop the
    // space entirely where punctuation makes it unnecessary.
    if (/\s/.test(ch)) {
      while (i < js.length && /\s/.test(js[i])) i++
      const prev = lastCode()
      const after = js[i]
      const joinable = /[{}()[\];,:<>+\-*/=&|!?]/
      if (prev && after && !joinable.test(prev) && !joinable.test(after)) out += ' '
      continue
    }

    out += ch
    i++
  }

  return out.trim()
}

export const minifyJavaScript = (js: string): JsFormatResult => {
  if (!js.trim()) {
    return {
      isValid: false,
      error: 'JavaScript is empty'
    }
  }

  try {
    const minified = minifyJsSource(js)

    return {
      isValid: true,
      formatted: minified
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'JavaScript minification failed'
    }
  }
}

