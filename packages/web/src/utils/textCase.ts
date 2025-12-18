/**
 * Text case conversion utilities
 */

export type CaseType = 'lowercase' | 'uppercase' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant'

/**
 * Converts text to different cases
 */
export const convertCase = (text: string, caseType: CaseType): string => {
  if (!text.trim()) return ''

  switch (caseType) {
    case 'lowercase':
      return text.toLowerCase()

    case 'uppercase':
      return text.toUpperCase()

    case 'title':
      return text
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()

    case 'camel':
      return text
        .split(/[\s\-_]+/)
        .map((word, index) => {
          if (index === 0) {
            return word.toLowerCase()
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join('')

    case 'pascal':
      return text
        .split(/[\s\-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')

    case 'snake':
      return text
        .split(/[\s\-_]+/)
        .map(word => word.toLowerCase())
        .join('_')

    case 'kebab':
      return text
        .split(/[\s\-_]+/)
        .map(word => word.toLowerCase())
        .join('-')

    case 'constant':
      return text
        .split(/[\s\-_]+/)
        .map(word => word.toUpperCase())
        .join('_')

    default:
      return text
  }
}

