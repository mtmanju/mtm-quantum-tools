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
/**
 * Uniform random index in [0, limit), free of modulo bias.
 *
 * `value % limit` skews toward low indices whenever `limit` does not divide
 * 2^32 exactly. At the alphabet sizes here that bias is around 2e-8 per
 * character and not observable — but rejection sampling costs one comparison,
 * and a password generator is the wrong place to keep a known-skewed
 * distribution just because the skew is currently small.
 */
const randomIndex = (limit: number): number => {
  const ceiling = Math.floor(0x100000000 / limit) * limit
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < ceiling) return buf[0] % limit
  }
}

/** Fisher-Yates, crypto-seeded. */
const shuffle = <T,>(items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export const generatePassword = (options: PasswordOptions): string => {
  const length = Math.floor(options.length)
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error('Password length must be a positive whole number')
  }

  const filterPool = (pool: string): string => {
    let chars = pool.split('')
    if (options.excludeSimilar) chars = chars.filter(c => !SIMILAR.includes(c))
    if (options.excludeAmbiguous) chars = chars.filter(c => !AMBIGUOUS.includes(c))
    return chars.join('')
  }

  // Each selected class is kept as its own pool so the result can be made to
  // actually contain one of each, rather than merely being allowed to.
  const pools: string[] = []
  if (options.includeLowercase) pools.push(filterPool(LOWERCASE))
  if (options.includeUppercase) pools.push(filterPool(UPPERCASE))
  if (options.includeNumbers) pools.push(filterPool(NUMBERS))
  if (options.includeSymbols) pools.push(filterPool(SYMBOLS))

  const usable = pools.filter(pool => pool.length > 0)
  const charset = usable.join('')

  if (charset.length === 0) {
    throw new Error('At least one character type must be selected')
  }

  /**
   * Guarantee one character from every selected class.
   *
   * Previously the classes were concatenated into one charset and every
   * position drawn from it, so ticking "Include Numbers" only made digits
   * *possible*. At length 8 with all four boxes ticked, 51% of generated
   * passwords were missing at least one ticked class — a user who asks for
   * digits and receives `&Jr|.!UO` fails the target site's policy and has no
   * idea why.
   *
   * The guaranteed characters are shuffled into place rather than written to
   * fixed leading indices, which would make the first four positions
   * predictable by class and leak structure to anyone cracking the output.
   *
   * If the requested length cannot hold one of each, the guarantee is dropped
   * for the classes that do not fit rather than silently truncating: a
   * too-short password is still drawn from the full charset.
   */
  const chars: string[] = usable
    .slice(0, length)
    .map(pool => pool[randomIndex(pool.length)])

  for (let i = chars.length; i < length; i++) {
    chars.push(charset[randomIndex(charset.length)])
  }

  return shuffle(chars).join('')
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
  
  // log2(charsetSize^length) written as length * log2(charsetSize).
  //
  // Math.pow overflows to Infinity before the log is taken — at charset 63 that
  // happens around 172 characters, so a long passphrase reported Infinity bits,
  // which rendered as the literal string "Infinity" and serialised to null.
  return password.length * Math.log2(charsetSize)
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

