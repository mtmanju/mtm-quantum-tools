/**
 * YAML formatting utilities
 */

/**
 * Formats YAML with proper indentation
 */
export const formatYaml = (yaml: string): string => {
  if (!yaml.trim()) return ''

  const lines = yaml.split('\n')
  const formatted: string[] = []
  let indentLevel = 0
  const indentSize = 2

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      formatted.push('')
      continue
    }

    // Check if line decreases indent (starts with closing or is less indented)
    const currentIndent = line.length - trimmed.length
    if (currentIndent < indentLevel * indentSize && formatted.length > 0) {
      indentLevel = Math.max(0, Math.floor(currentIndent / indentSize))
    }

    // Check if line is a list item
    if (trimmed.startsWith('-')) {
      formatted.push(' '.repeat(indentLevel * indentSize) + trimmed)
      // Next line might be indented
      if (trimmed.length > 1 && trimmed[1] !== ' ') {
        indentLevel++
      }
    } else if (trimmed.endsWith(':')) {
      formatted.push(' '.repeat(indentLevel * indentSize) + trimmed)
      indentLevel++
    } else {
      formatted.push(' '.repeat(indentLevel * indentSize) + trimmed)
    }
  }

  return formatted.join('\n')
}

/**
 * Validates basic YAML syntax
 */
export const validateYaml = (yaml: string): { isValid: boolean; error?: string } => {
  if (!yaml.trim()) {
    return {
      isValid: false,
      error: 'Please enter YAML content'
    }
  }

  // Basic validation - check for balanced colons and proper structure
  const lines = yaml.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const currentIndent = line.length - trimmed.length

    // Check for inconsistent indentation
    if (currentIndent > 0 && currentIndent % 2 !== 0 && !trimmed.startsWith('-')) {
      return {
        isValid: false,
        error: `Line ${i + 1}: Inconsistent indentation (should be multiple of 2 spaces)`
      }
    }

    // Check for key-value pairs
    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex === 0) {
        return {
          isValid: false,
          error: `Line ${i + 1}: Invalid key format`
        }
      }
    }
  }

  return {
    isValid: true
  }
}

