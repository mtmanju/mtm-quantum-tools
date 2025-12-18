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
 * Calculates password strength
 */
export const calculatePasswordStrength = (password: string): {
  score: number
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  feedback: string[]
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

  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
  if (score <= 2) {
    strength = 'weak'
  } else if (score === 3) {
    strength = 'fair'
  } else if (score === 4) {
    strength = 'good'
  } else if (score === 5) {
    strength = 'strong'
  } else {
    strength = 'very-strong'
  }

  return { score, strength, feedback }
}

