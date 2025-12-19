/**
 * Text case conversion utilities
 */

export type CaseType = 'lowercase' | 'uppercase' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant'

/**
 * Converts text to different cases
 */
export const convertCase = (text: string, caseType: CaseType): string => {
  // Defensive: Handle null/undefined inputs
  if (text == null) return ''
  if (typeof text !== 'string') {
    try {
      text = String(text)
    } catch {
      return ''
    }
  }
  
  if (!text.trim()) return ''
  
  // Validate caseType
  const validCases: CaseType[] = ['lowercase', 'uppercase', 'title', 'sentence', 'camel', 'pascal', 'snake', 'kebab', 'constant']
  if (!validCases.includes(caseType)) {
    caseType = 'lowercase' // Default fallback
  }

  try {
    switch (caseType) {
      case 'lowercase':
        return text.toLowerCase()

      case 'uppercase':
        return text.toUpperCase()

      case 'title':
        return text
          .split(/\s+/)
          .filter(word => word.length > 0)
          .map(word => {
            const firstChar = word.charAt(0)
            if (!firstChar) return word
            return firstChar.toUpperCase() + word.slice(1).toLowerCase()
          })
          .join(' ')

      case 'sentence':
        const firstChar = text.charAt(0)
        if (!firstChar) return text
        return firstChar.toUpperCase() + text.slice(1).toLowerCase()

      case 'camel':
        return text
          .split(/[\s\-_]+/)
          .filter(word => word.length > 0)
          .map((word, index) => {
            if (index === 0) {
              return word.toLowerCase()
            }
            const firstChar = word.charAt(0)
            if (!firstChar) return word
            return firstChar.toUpperCase() + word.slice(1).toLowerCase()
          })
          .join('')

      case 'pascal':
        return text
          .split(/[\s\-_]+/)
          .filter(word => word.length > 0)
          .map(word => {
            const firstChar = word.charAt(0)
            if (!firstChar) return word
            return firstChar.toUpperCase() + word.slice(1).toLowerCase()
          })
          .join('')

      case 'snake':
        return text
          .split(/[\s\-_]+/)
          .filter(word => word.length > 0)
          .map(word => word.toLowerCase())
          .join('_')

      case 'kebab':
        return text
          .split(/[\s\-_]+/)
          .filter(word => word.length > 0)
          .map(word => word.toLowerCase())
          .join('-')

      case 'constant':
        return text
          .split(/[\s\-_]+/)
          .filter(word => word.length > 0)
          .map(word => word.toUpperCase())
          .join('_')

      default:
        return text
    }
  } catch (error) {
    // If any error occurs, return original text
    return text
  }
}

