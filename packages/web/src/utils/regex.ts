/**
 * Regex testing and matching utilities
 */

export interface RegexFlags {
  global: boolean
  caseInsensitive: boolean
  multiline: boolean
  dotAll: boolean
  unicode: boolean
  sticky: boolean
}

export interface RegexMatch {
  match: string
  index: number
  groups: string[]
  namedGroups?: Record<string, string>
}

export interface RegexTestResult {
  isValid: boolean
  error?: string
  matches: RegexMatch[]
  testString: string
  pattern: string
  flags: string
}

/**
 * Converts flags object to regex flag string
 */
export const flagsToString = (flags: RegexFlags): string => {
  let flagStr = ''
  if (flags.global) flagStr += 'g'
  if (flags.caseInsensitive) flagStr += 'i'
  if (flags.multiline) flagStr += 'm'
  if (flags.dotAll) flagStr += 's'
  if (flags.unicode) flagStr += 'u'
  if (flags.sticky) flagStr += 'y'
  return flagStr
}

/**
 * Tests a regex pattern against a test string
 */
export const testRegex = (
  pattern: string,
  testString: string,
  flags: RegexFlags
): RegexTestResult => {
  if (!pattern.trim()) {
    return {
      isValid: false,
      error: 'Please enter a regex pattern',
      matches: [],
      testString,
      pattern,
      flags: flagsToString(flags)
    }
  }

  try {
    const flagStr = flagsToString(flags)
    const regex = new RegExp(pattern, flagStr)
    const matches: RegexMatch[] = []

    if (flags.global) {
      // Global match - find all matches
      let match: RegExpExecArray | null
      const regexClone = new RegExp(pattern, flagStr)
      
      while ((match = regexClone.exec(testString)) !== null) {
        if (!match) break
        
        const groups: string[] = []
        for (let i = 1; i < match.length; i++) {
          groups.push(match[i] || '')
        }

        const namedGroups: Record<string, string> = {}
        const matchGroups = match.groups
        if (matchGroups) {
          Object.keys(matchGroups).forEach(key => {
            namedGroups[key] = matchGroups[key] || ''
          })
        }

        matches.push({
          match: match[0],
          index: match.index ?? 0,
          groups,
          namedGroups: Object.keys(namedGroups).length > 0 ? namedGroups : undefined
        })

        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          regexClone.lastIndex++
        }
      }
    } else {
      // Single match
      const match: RegExpExecArray | null = regex.exec(testString)
      if (match) {
        const captureGroups: string[] = []
        for (let i = 1; i < match.length; i++) {
          captureGroups.push(match[i] || '')
        }

        const namedGroups: Record<string, string> = {}
        const matchGroups = match.groups
        if (matchGroups) {
          Object.keys(matchGroups).forEach(key => {
            namedGroups[key] = matchGroups[key] || ''
          })
        }

        matches.push({
          match: match[0],
          index: match.index ?? 0,
          groups: captureGroups,
          namedGroups: Object.keys(namedGroups).length > 0 ? namedGroups : undefined
        })
      }
    }

    return {
      isValid: true,
      matches,
      testString,
      pattern,
      flags: flagStr
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid regex pattern',
      matches: [],
      testString,
      pattern,
      flags: flagsToString(flags)
    }
  }
}

/**
 * Escapes special regex characters for display
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Highlights matches in text
 */
export const highlightMatches = (
  text: string,
  matches: RegexMatch[]
): Array<{ text: string; isMatch: boolean; index: number }> => {
  if (matches.length === 0) {
    return [{ text, isMatch: false, index: 0 }]
  }

  const parts: Array<{ text: string; isMatch: boolean; index: number }> = []
  let lastIndex = 0

  // Sort matches by index
  const sortedMatches = [...matches].sort((a, b) => a.index - b.index)

  sortedMatches.forEach(match => {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isMatch: false,
        index: lastIndex
      })
    }

    // Add match
    parts.push({
      text: match.match,
      isMatch: true,
      index: match.index
    })

    lastIndex = match.index + match.match.length
  })

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isMatch: false,
      index: lastIndex
    })
  }

  return parts
}

