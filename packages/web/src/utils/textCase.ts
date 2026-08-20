/**
 * Text case conversion utilities
 */

export type CaseType = 'lowercase' | 'uppercase' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant'

/**
 * Converts text to different cases
 */
/**
 * Split a string into words, including at case boundaries.
 *
 * The converters split on `[\s\-_]+` alone, so a camelCase or PascalCase
 * input was a single word: convertCase('helloWorldFoo', 'snake') returned
 * 'helloworldfoo' rather than 'hello_world_foo'. Converting camelCase to
 * snake_case is the main reason a case converter exists, and it was the one
 * thing this could not do — it only worked on text that was already
 * space-separated.
 *
 * The two boundaries that matter:
 *   lower|digit -> Upper   parseValue  -> parse Value
 *   ACRONYM     -> Word    XMLHttp     -> XML Http
 *
 * so parseXMLHttpRequest becomes parse / XML / Http / Request.
 */
const splitWords = (text: string): string[] =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s\-_]+/)
    .filter(word => word.length > 0)

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
        return splitWords(text)
          .map(word => {
            const firstChar = word.charAt(0)
            if (!firstChar) return word
            return firstChar.toUpperCase() + word.slice(1).toLowerCase()
          })
          .join(' ')

      case 'sentence': {
        const firstChar = text.charAt(0)
        if (!firstChar) return text
        return firstChar.toUpperCase() + text.slice(1).toLowerCase()
      }

      case 'camel':
        return splitWords(text)
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
        return splitWords(text)
          .map(word => {
            const firstChar = word.charAt(0)
            if (!firstChar) return word
            return firstChar.toUpperCase() + word.slice(1).toLowerCase()
          })
          .join('')

      case 'snake':
        return splitWords(text)
          .map(word => word.toLowerCase())
          .join('_')

      case 'kebab':
        return splitWords(text)
          .map(word => word.toLowerCase())
          .join('-')

      case 'constant':
        return splitWords(text)
          .map(word => word.toUpperCase())
          .join('_')

      default:
        return text
    }
  } catch {
    // If any error occurs, return original text
    return text
  }
}

