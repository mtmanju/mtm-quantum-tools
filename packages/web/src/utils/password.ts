/**
 * Password generation utilities
 */

export interface PasswordOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeSimilar: boolean
  excludeAmbiguous: boolean
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const SIMILAR = 'il1Lo0O'
const AMBIGUOUS = '{}[]()/\\\'"`~,;:.<>'

/**
 * Generates a passphrase from word list
 */
export const generatePassphrase = (wordCount: number = 4, separator: string = '-'): string => {
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'hammer',
    'island', 'jungle', 'knight', 'lighthouse', 'mountain', 'ocean', 'palace', 'quasar',
    'river', 'sunset', 'tiger', 'umbrella', 'violet', 'waterfall', 'xylophone', 'yacht', 'zebra',
    'anchor', 'bridge', 'castle', 'diamond', 'elephant', 'falcon', 'galaxy', 'horizon',
    'iceberg', 'jaguar', 'kangaroo', 'lighthouse', 'meadow', 'nebula', 'orchard', 'penguin',
    'quartz', 'rainbow', 'sapphire', 'thunder', 'unicorn', 'volcano', 'whisper', 'xenon',
    'yellow', 'zenith', 'alpine', 'breeze', 'cascade', 'dolphin', 'emerald', 'flamingo'
  ]

  const selected: string[] = []
  const randomArray = new Uint32Array(wordCount)
  crypto.getRandomValues(randomArray)
  
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = randomArray[i] % words.length
    selected.push(words[randomIndex])
  }

  return selected.join(separator)
}

/**
 * Generates a random password based on options
 */
export const generatePassword = (options: PasswordOptions): string => {
  let charset = ''

  if (options.includeLowercase) {
    charset += LOWERCASE
  }
  if (options.includeUppercase) {
    charset += UPPERCASE
  }
  if (options.includeNumbers) {
    charset += NUMBERS
  }
  if (options.includeSymbols) {
    charset += SYMBOLS
  }

  if (options.excludeSimilar) {
    charset = charset.split('').filter(char => !SIMILAR.includes(char)).join('')
  }

  if (options.excludeAmbiguous) {
    charset = charset.split('').filter(char => !AMBIGUOUS.includes(char)).join('')
  }

  if (charset.length === 0) {
    throw new Error('At least one character type must be selected')
  }

  const password: string[] = []
  const array = new Uint32Array(options.length)
  crypto.getRandomValues(array)

  for (let i = 0; i < options.length; i++) {
    password.push(charset[array[i] % charset.length])
  }

  return password.join('')
}

/**
 * Calculates password entropy (bits of entropy)
 */
export const calculatePasswordEntropy = (password: string): number => {
  if (!password) return 0
  
  // Count character sets used
  let charsetSize = 0
  if (/[a-z]/.test(password)) charsetSize += 26
  if (/[A-Z]/.test(password)) charsetSize += 26
  if (/[0-9]/.test(password)) charsetSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) {
    // Count unique special characters
    const specialChars = password.match(/[^a-zA-Z0-9]/g)
    if (specialChars) {
      charsetSize += new Set(specialChars).size
    }
  }
  
  if (charsetSize === 0) return 0
  
  // Entropy = log2(charsetSize^length)
  return Math.log2(Math.pow(charsetSize, password.length))
}

/**
 * Calculates password strength with entropy
 */
export const calculatePasswordStrength = (password: string): {
  score: number
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  feedback: string[]
  entropy: number
} => {
  let score = 0
  const feedback: string[] = []

  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters long')
  } else {
    score += 1
  }

  if (password.length >= 12) {
    score += 1
  }
  
  if (password.length >= 16) {
    score += 0.5
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Add lowercase letters')
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Add uppercase letters')
  }

  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Add numbers')
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Add special characters')
  }
  
  // Check for common patterns (reduce score)
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /(012|123|234|345|456|567|678|789|890)/, // Sequential numbers
    /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential letters
    /(qwerty|asdfgh|zxcvbn|password|123456)/i // Common passwords
  ]
  
  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password))
  if (hasCommonPattern) {
    score -= 1
    feedback.push('Avoid common patterns or sequences')
  }
  
  // Calculate entropy
  const entropy = calculatePasswordEntropy(password)
  
  // Adjust score based on entropy
  if (entropy >= 80) {
    score += 1
  } else if (entropy < 40) {
    score -= 1
    feedback.push('Password has low entropy - use more diverse characters')
  }

  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  const finalScore = Math.max(0, Math.min(7, Math.round(score)))
  
  if (finalScore <= 2) {
    strength = 'weak'
  } else if (finalScore === 3) {
    strength = 'fair'
  } else if (finalScore === 4) {
    strength = 'good'
  } else if (finalScore === 5 || finalScore === 6) {
    strength = 'strong'
  } else {
    strength = 'very-strong'
  }

  return { score: finalScore, strength, feedback, entropy }
}

