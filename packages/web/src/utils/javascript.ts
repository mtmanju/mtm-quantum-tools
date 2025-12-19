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

export const minifyJavaScript = (js: string): JsFormatResult => {
  if (!js.trim()) {
    return {
      isValid: false,
      error: 'JavaScript is empty'
    }
  }

  try {
    const minified = js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '') // Remove line comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*\{\s*/g, '{') // Remove spaces around {
      .replace(/\s*\}\s*/g, '}') // Remove spaces around }
      .replace(/\s*\(\s*/g, '(') // Remove spaces around (
      .replace(/\s*\)\s*/g, ')') // Remove spaces around )
      .replace(/\s*\[\s*/g, '[') // Remove spaces around [
      .replace(/\s*\]\s*/g, ']') // Remove spaces around ]
      .replace(/\s*;\s*/g, ';') // Remove spaces around ;
      .replace(/\s*,\s*/g, ',') // Remove spaces around ,
      .replace(/\s*:\s*/g, ':') // Remove spaces around :
      .replace(/\s*=\s*/g, '=') // Remove spaces around =
      .replace(/\s*\+\s*/g, '+') // Remove spaces around +
      .replace(/\s*-\s*/g, '-') // Remove spaces around -
      .replace(/\s*\*\s*/g, '*') // Remove spaces around *
      .replace(/\s*\/\s*/g, '/') // Remove spaces around /
      .replace(/\s*>\s*/g, '>') // Remove spaces around >
      .replace(/\s*<\s*/g, '<') // Remove spaces around <
      .replace(/\s*&&\s*/g, '&&') // Remove spaces around &&
      .replace(/\s*\|\|\s*/g, '||') // Remove spaces around ||
      .trim()

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

