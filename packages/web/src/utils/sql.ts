/**
 * SQL formatting utilities
 */

/**
 * Formats SQL query with proper indentation
 */
export const formatSql = (sql: string): string => {
  if (!sql.trim()) return ''

  let formatted = sql.trim()
  
  // Basic SQL formatting
  // Split by common delimiters while preserving them
  let result = formatted
  let indentLevel = 0
  const indentSize = 2
  const lines: string[] = []

  // Simple tokenization
  result = result.replace(/\s+/g, ' ')
  
  // Split by semicolons first
  const statements = result.split(';').filter(s => s.trim())
  
  statements.forEach((statement) => {
    if (statements.indexOf(statement) > 0) {
      lines.push('')
    }
    
    let currentLine = ''
    indentLevel = 0
    
    // Split by spaces and handle keywords
    const words = statement.trim().split(/\s+/)
    
    words.forEach((word) => {
      const upperWord = word.toUpperCase()
      
      // Handle opening clauses that increase indent
      if (['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP', 'ORDER', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'].includes(upperWord)) {
        if (currentLine.trim()) {
          lines.push(' '.repeat(indentLevel * indentSize) + currentLine.trim())
          currentLine = ''
        }
        lines.push(' '.repeat(indentLevel * indentSize) + word)
        if (['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP', 'ORDER', 'HAVING'].includes(upperWord)) {
          indentLevel++
        }
      }
      // Handle closing clauses
      else if (upperWord === 'ON' && indentLevel > 0) {
        if (currentLine.trim()) {
          lines.push(' '.repeat(indentLevel * indentSize) + currentLine.trim())
          currentLine = ''
        }
        indentLevel--
        lines.push(' '.repeat(indentLevel * indentSize) + word)
        indentLevel++
      }
      // Handle comma-separated lists
      else if (word.endsWith(',')) {
        currentLine += word + ' '
        if (indentLevel > 0) {
          lines.push(' '.repeat(indentLevel * indentSize) + currentLine.trim())
          currentLine = ''
        }
      }
      // Regular word
      else {
        currentLine += word + ' '
      }
    })
    
    if (currentLine.trim()) {
      lines.push(' '.repeat(indentLevel * indentSize) + currentLine.trim())
    }
    
    // Reset indent for next statement
    indentLevel = 0
  })
  
  return lines.join('\n').trim() || formatted
}

/**
 * Minifies SQL query (removes extra whitespace)
 */
export const minifySql = (sql: string): string => {
  if (!sql.trim()) return ''
  
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/--.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s*([,;()])\s*/g, '$1') // Remove spaces around punctuation
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
  const openParens = (sql.match(/\(/g) || []).length
  const closeParens = (sql.match(/\)/g) || []).length
  
  if (openParens !== closeParens) {
    return {
      isValid: false,
      error: 'Unbalanced parentheses'
    }
  }

  // Check for balanced quotes
  const singleQuotes = (sql.match(/'/g) || []).length
  if (singleQuotes % 2 !== 0) {
    return {
      isValid: false,
      error: 'Unbalanced single quotes'
    }
  }

  const doubleQuotes = (sql.match(/"/g) || []).length
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

