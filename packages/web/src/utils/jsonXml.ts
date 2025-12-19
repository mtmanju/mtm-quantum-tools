export interface JsonXmlResult {
  isValid: boolean
  converted?: string
  error?: string
}

export const jsonToXml = (json: string, rootElement: string = 'root'): JsonXmlResult => {
  if (!json.trim()) {
    return {
      isValid: false,
      error: 'JSON is empty'
    }
  }

  try {
    const obj = JSON.parse(json)
    const xml = convertObjectToXml(obj, rootElement)
    
    return {
      isValid: true,
      converted: `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format'
    }
  }
}

export const xmlToJson = (xml: string): JsonXmlResult => {
  if (!xml.trim()) {
    return {
      isValid: false,
      error: 'XML is empty'
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

    const root = doc.documentElement
    const json = convertXmlToObject(root)
    const jsonString = JSON.stringify(json, null, 2)
    
    return {
      isValid: true,
      converted: jsonString
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'XML to JSON conversion failed'
    }
  }
}

const convertObjectToXml = (obj: any, rootName: string): string => {
  if (obj === null || obj === undefined) {
    return `<${rootName}></${rootName}>`
  }

  if (typeof obj !== 'object') {
    return `<${rootName}>${escapeXml(String(obj))}</${rootName}>`
  }

    if (Array.isArray(obj)) {
      return obj.map((item) => 
        convertObjectToXml(item, `${rootName}_item`)
      ).join('\n')
    }

  let xml = `<${rootName}>`
  for (const [key, value] of Object.entries(obj)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_')
    if (value === null || value === undefined) {
      xml += `\n  <${safeKey}></${safeKey}>`
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach(item => {
          xml += '\n  ' + convertObjectToXml(item, safeKey).replace(/\n/g, '\n  ')
        })
      } else {
        xml += '\n  ' + convertObjectToXml(value, safeKey).replace(/\n/g, '\n  ')
      }
    } else {
      xml += `\n  <${safeKey}>${escapeXml(String(value))}</${safeKey}>`
    }
  }
  xml += `\n</${rootName}>`
  return xml
}

const convertXmlToObject = (node: Element): any => {
  if (node.childNodes.length === 0) {
    return node.textContent || ''
  }

  if (node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  const obj: any = {}
  const children = Array.from(node.children)
  
  if (children.length === 0) {
    return node.textContent || ''
  }

  children.forEach(child => {
    const key = child.tagName
    const value = convertXmlToObject(child)
    
    if (obj[key]) {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]]
      }
      obj[key].push(value)
    } else {
      obj[key] = value
    }
  })

  return obj
}

const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

