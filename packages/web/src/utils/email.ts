export interface EmailValidationResult {
  isValid: boolean
  error?: string
  details?: {
    hasAt: boolean
    hasDomain: boolean
    hasTld: boolean
    domain?: string
    localPart?: string
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export const validateEmail = (email: string, strict: boolean = false): EmailValidationResult => {
  if (!email.trim()) {
    return {
      isValid: false,
      error: 'Email is empty'
    }
  }

  const trimmed = email.trim()
  const regex = strict ? STRICT_EMAIL_REGEX : EMAIL_REGEX

  if (!regex.test(trimmed)) {
    const parts = trimmed.split('@')
    const hasAt = parts.length === 2
    const localPart = hasAt ? parts[0] : ''
    const domain = hasAt ? parts[1] : ''
    const hasDomain = domain.length > 0
    const hasTld = hasDomain && domain.includes('.')

    let error = 'Invalid email format'
    if (!hasAt) {
      error = 'Missing @ symbol'
    } else if (!hasDomain) {
      error = 'Missing domain'
    } else if (!hasTld) {
      error = 'Missing top-level domain (e.g., .com)'
    } else if (localPart.length === 0) {
      error = 'Missing local part (before @)'
    }

    return {
      isValid: false,
      error,
      details: {
        hasAt,
        hasDomain,
        hasTld,
        domain: hasDomain ? domain : undefined,
        localPart: localPart || undefined
      }
    }
  }

  const [localPart, domain] = trimmed.split('@')

  return {
    isValid: true,
    details: {
      hasAt: true,
      hasDomain: true,
      hasTld: true,
      domain,
      localPart
    }
  }
}

