export interface SlugResult {
  isValid: boolean
  slug?: string
  error?: string
}

export const textToSlug = (text: string, separator: string = '-'): SlugResult => {
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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

