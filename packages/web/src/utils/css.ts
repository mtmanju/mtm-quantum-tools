export interface CssFormatResult {
  isValid: boolean
  formatted?: string
  error?: string
}

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
    let inComment = false
    let inString = false
    let stringChar = ''

    for (let i = 0; i < css.length; i++) {
      const char = css[i]
      const nextChar = css[i + 1]
      const prevChar = css[i - 1]

      if (inComment) {
        formatted += char
        if (char === '*' && nextChar === '/') {
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

      if (char === '/' && nextChar === '*') {
        inComment = true
        formatted += char
        continue
      }

      if (char === '"' || char === "'") {
        inString = true
        stringChar = char
        formatted += char
        continue
      }

      if (char === '{') {
        inRule = true
        formatted += ' {\n'
        indentLevel++
        formatted += indentStr.repeat(indentLevel)
        continue
      }

      if (char === '}') {
        indentLevel = Math.max(0, indentLevel - 1)
        formatted += '\n' + indentStr.repeat(indentLevel) + '}'
        inRule = false
        continue
      }

      if (char === ';') {
        formatted += ';\n'
        if (inRule) {
          formatted += indentStr.repeat(indentLevel)
        }
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
      error: error instanceof Error ? error.message : 'CSS formatting failed'
    }
  }
}

export const minifyCss = (css: string): CssFormatResult => {
  if (!css.trim()) {
    return {
      isValid: false,
      error: 'CSS is empty'
    }
  }

  try {
    const minified = css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*\{\s*/g, '{') // Remove spaces around {
      .replace(/\s*\}\s*/g, '}') // Remove spaces around }
      .replace(/\s*:\s*/g, ':') // Remove spaces around :
      .replace(/\s*;\s*/g, ';') // Remove spaces around ;
      .replace(/\s*,\s*/g, ',') // Remove spaces around ,
      .replace(/\s*>\s*/g, '>') // Remove spaces around >
      .replace(/\s*\+\s*/g, '+') // Remove spaces around +
      .replace(/\s*~\s*/g, '~') // Remove spaces around ~
      .replace(/;\}/g, '}') // Remove ; before }
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
    // Basic validation - check for balanced braces
    let braceCount = 0
    let inString = false
    let stringChar = ''

    for (let i = 0; i < css.length; i++) {
      const char = css[i]
      const prevChar = css[i - 1]

      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false
        }
        continue
      }

      if (char === '"' || char === "'") {
        inString = true
        stringChar = char
        continue
      }

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

