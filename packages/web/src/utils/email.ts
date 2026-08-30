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

/**
 * Strict mode: a dot-atom local part, per RFC 5322 §3.2.3.
 *
 * The previous class put `.` inside the atom (`[a-zA-Z0-9.!#$...]+`), which
 * makes a dot an ordinary character — so `a..b@example.com`, `.user@example.com`
 * and `user.@example.com` all passed strict validation. A dot-atom is
 * `atom ('.' atom)*`: dots separate atoms and therefore cannot lead, trail, or
 * repeat.
 */
const ATOM = "[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+"
const STRICT_EMAIL_REGEX = new RegExp(
  `^${ATOM}(?:\\.${ATOM})*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`
)

/** RFC 5321 §4.5.3.1: 64 octets for the local part, 254 for the whole path. */
const MAX_LOCAL_PART = 64
const MAX_EMAIL_LENGTH = 254

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
    // `parts.length === 2` made hasAt false for `user@@example.com`, which then
    // reported "Missing @ symbol" for an address containing two of them.
    const hasAt = trimmed.includes('@')
    const localPart = parts.length === 2 ? parts[0] : ''
    const domain = parts.length === 2 ? parts[1] : ''
    const hasDomain = domain.length > 0
    const hasTld = hasDomain && domain.includes('.')

    let error = 'Invalid email format'
    if (!hasAt) {
      error = 'Missing @ symbol'
    } else if (parts.length > 2) {
      error = 'Address contains more than one @ symbol'
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

  // Additional validation in strict mode
  if (strict) {
    /**
     * Length limits nothing else enforced.
     *
     * validateDomain covers the 253/63 domain limits, but the local part had no
     * ceiling at all — a 65-character local part with a short domain passed, and
     * the only reason a 319-character address was rejected was that its *domain*
     * happened to be over-long.
     */
    if (localPart.length > MAX_LOCAL_PART) {
      return {
        isValid: false,
        error: `Local part exceeds maximum length (${MAX_LOCAL_PART} characters)`,
        details: { hasAt: true, hasDomain: true, hasTld: domain.includes('.'), domain, localPart }
      }
    }

    if (trimmed.length > MAX_EMAIL_LENGTH) {
      return {
        isValid: false,
        error: `Address exceeds maximum length (${MAX_EMAIL_LENGTH} characters)`,
        details: { hasAt: true, hasDomain: true, hasTld: domain.includes('.'), domain, localPart }
      }
    }

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

