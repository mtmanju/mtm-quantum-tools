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
    const minified = xml
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/\s*>\s*/g, '>')
      .replace(/\s*<\s*/g, '<')
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

const formatXmlString = (xml: string, indent: number): string => {
  let formatted = ''
  let indentLevel = 0
  const indentStr = ' '.repeat(indent)
  
  xml = xml.replace(/>\s+</g, '><')
  
  for (let i = 0; i < xml.length; i++) {
    const char = xml[i]
    const nextChar = xml[i + 1]
    
    if (char === '<' && nextChar === '/') {
      indentLevel--
      formatted += '\n' + indentStr.repeat(Math.max(0, indentLevel))
      formatted += char
    } else if (char === '<') {
      if (i > 0 && xml[i - 1] === '>') {
        formatted += '\n' + indentStr.repeat(indentLevel)
      }
      formatted += char
      if (nextChar !== '/' && nextChar !== '?') {
        indentLevel++
      }
    } else if (char === '>') {
      formatted += char
      if (nextChar && nextChar !== '<') {
        formatted += '\n' + indentStr.repeat(indentLevel)
      }
    } else {
      formatted += char
    }
  }
  
  return formatted.trim()
}

