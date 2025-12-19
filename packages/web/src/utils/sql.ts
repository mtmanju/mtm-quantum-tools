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
  // Need to account for escaped quotes and comments
  let openParens = 0
  let closeParens = 0
  let singleQuotes = 0
  let doubleQuotes = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inComment = false
  let commentType = ''
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const nextChar = sql[i + 1]
    const prevChar = sql[i - 1]
    
    // Handle comments
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '-' && nextChar === '-' && !inComment) {
        inComment = true
        commentType = '--'
        i++
        continue
      }
      if (char === '/' && nextChar === '*' && !inComment) {
        inComment = true
        commentType = '/*'
        i++
        continue
      }
      if (inComment && commentType === '/*' && char === '*' && nextChar === '/') {
        inComment = false
        i++
        continue
      }
      if (inComment && commentType === '--' && char === '\n') {
        inComment = false
        continue
      }
      if (inComment) continue
    }
    
    // Handle quotes (account for escaped quotes)
    if (!inComment) {
      if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote
        singleQuotes++
      } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote
        doubleQuotes++
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') openParens++
        else if (char === ')') closeParens++
      }
    }
  }
  
  if (openParens !== closeParens) {
    return {
      isValid: false,
      error: 'Unbalanced parentheses'
    }
  }

  if (singleQuotes % 2 !== 0) {
    return {
      isValid: false,
      error: 'Unbalanced single quotes'
    }
  }

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

