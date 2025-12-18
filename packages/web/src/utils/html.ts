/**
 * HTML formatting utilities
 */

/**
 * Formats HTML with proper indentation
 */
export const formatHtml = (html: string): string => {
  if (!html.trim()) return ''

  let formatted = ''
  let indent = 0
  const indentSize = 2

  // Remove existing whitespace between tags
  html = html.replace(/>\s+</g, '><')

  // Split by tags
  const tokens = html.split(/(<[^>]+>)/)

  for (const token of tokens) {
    if (!token.trim()) continue

    if (token.startsWith('</')) {
      // Closing tag
      indent--
      formatted += ' '.repeat(indent * indentSize) + token + '\n'
    } else if (token.startsWith('<')) {
      // Opening tag
      formatted += ' '.repeat(indent * indentSize) + token + '\n'
      // Check if it's a self-closing tag
      if (!token.match(/\/\s*>$/)) {
        indent++
      }
    } else {
      // Text content
      const trimmed = token.trim()
      if (trimmed) {
        formatted += ' '.repeat(indent * indentSize) + trimmed + '\n'
      }
    }
  }

  return formatted.trim()
}

/**
 * Minifies HTML (removes whitespace)
 */
export const minifyHtml = (html: string): string => {
  if (!html.trim()) return ''

  return html
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around punctuation
    .trim()
}

/**
 * Validates basic HTML structure
 */
export const validateHtml = (html: string): { isValid: boolean; error?: string } => {
  if (!html.trim()) {
    return {
      isValid: false,
      error: 'Please enter HTML content'
    }
  }

  // Check for balanced tags (basic check)
  const openTags = (html.match(/<[^/!?][^>]*>/g) || []).length
  const closeTags = (html.match(/<\/[^>]+>/g) || []).length

  // This is a simple check - real HTML validation is more complex
  if (openTags < closeTags) {
    return {
      isValid: false,
      error: 'More closing tags than opening tags'
    }
  }

  return {
    isValid: true
  }
}

