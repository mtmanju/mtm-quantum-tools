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

// Standard email regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Strict email regex (RFC 5322 compliant)
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Enhanced validation for domain part
const validateDomain = (domain: string): { isValid: boolean; error?: string } => {
  if (!domain || domain.length === 0) {
    return { isValid: false, error: 'Domain is empty' }
  }
  
  if (domain.length > 253) {
    return { isValid: false, error: 'Domain exceeds maximum length (253 characters)' }
  }
  
  const parts = domain.split('.')
  if (parts.length < 2) {
    return { isValid: false, error: 'Domain must have at least one dot (e.g., example.com)' }
  }
  
  // Validate each part
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.length === 0) {
      return { isValid: false, error: 'Domain part cannot be empty' }
    }
    if (part.length > 63) {
      return { isValid: false, error: `Domain part "${part}" exceeds maximum length (63 characters)` }
    }
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(part)) {
      return { isValid: false, error: `Domain part "${part}" contains invalid characters` }
    }
  }
  
  // Validate TLD
  const tld = parts[parts.length - 1]
  if (tld.length < 2) {
    return { isValid: false, error: 'Top-level domain must be at least 2 characters' }
  }
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return { isValid: false, error: 'Top-level domain must contain only letters' }
  }
  
  return { isValid: true }
}

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

  // Additional domain validation in strict mode
  if (strict) {
    const domainValidation = validateDomain(domain)
    if (!domainValidation.isValid) {
      return {
        isValid: false,
        error: domainValidation.error || 'Invalid domain format',
        details: {
          hasAt: true,
          hasDomain: true,
          hasTld: domain.includes('.'),
          domain,
          localPart
        }
      }
    }
  }

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

