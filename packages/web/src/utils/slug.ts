export interface SlugResult {
  isValid: boolean
  slug?: string
  error?: string
}

export const textToSlug = (text: string, separator: string = '-'): SlugResult => {
  // Defensive: Handle null/undefined inputs
  if (text == null) {
    return {
      isValid: false,
      error: 'Text is null or undefined'
    }
  }
  
  if (typeof text !== 'string') {
    try {
      text = String(text)
    } catch {
      return {
        isValid: false,
        error: 'Text cannot be converted to string'
      }
    }
  }
  
  // Validate separator
  if (separator == null || typeof separator !== 'string') {
    separator = '-'
  }
  
  if (!text.trim()) {
    return {
      isValid: false,
      error: 'Text is empty'
    }
  }

  try {
    const slug = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_]+/g, separator) // Replace spaces and underscores with separator
      .replace(new RegExp(`${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+`, 'g'), separator) // Replace multiple separators with single separator
      .replace(new RegExp(`^${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+|${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}+$`, 'g'), '') // Remove leading/trailing separators

    if (!slug) {
      return {
        isValid: false,
        error: 'Resulting slug is empty'
      }
    }

    return {
      isValid: true,
      slug
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Slug generation failed'
    }
  }
}

export const slugToText = (slug: string): SlugResult => {
  // Defensive: Handle null/undefined inputs
  if (slug == null) {
    return {
      isValid: false,
      error: 'Slug is null or undefined'
    }
  }
  
  if (typeof slug !== 'string') {
    try {
      slug = String(slug)
    } catch {
      return {
        isValid: false,
        error: 'Slug cannot be converted to string'
      }
    }
  }
  
  if (!slug.trim()) {
    return {
      isValid: false,
      error: 'Slug is empty'
    }
  }

  try {
    const text = slug
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => {
        if (!word) return ''
        const firstChar = word.charAt(0)
        if (!firstChar) return word
        return firstChar.toUpperCase() + word.slice(1)
      })
      .filter(word => word.length > 0)
      .join(' ')

    return {
      isValid: true,
      slug: text
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Text conversion failed'
    }
  }
}

