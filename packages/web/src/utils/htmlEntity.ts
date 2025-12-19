export interface HtmlEntityResult {
  isValid: boolean
  encoded?: string
  decoded?: string
  error?: string
}

export const encodeHtmlEntities = (text: string): HtmlEntityResult => {
  if (!text.trim()) {
    return {
      isValid: false,
      error: 'Text is empty'
    }
  }

  try {
    const encoded = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\$/g, '&#36;')
      .replace(/\//g, '&#47;')
      .replace(/\\/g, '&#92;')
      .replace(/`/g, '&#96;')
      .replace(/=/g, '&#61;')
      .replace(/!/g, '&#33;')
      .replace(/@/g, '&#64;')
      .replace(/#/g, '&#35;')
      .replace(/%/g, '&#37;')
      .replace(/\^/g, '&#94;')
      .replace(/\*/g, '&#42;')
      .replace(/\(/g, '&#40;')
      .replace(/\)/g, '&#41;')
      .replace(/\{/g, '&#123;')
      .replace(/\}/g, '&#125;')
      .replace(/\[/g, '&#91;')
      .replace(/\]/g, '&#93;')
      .replace(/\|/g, '&#124;')
      .replace(/\+/g, '&#43;')
      .replace(/-/g, '&#45;')
      .replace(/:/g, '&#58;')
      .replace(/;/g, '&#59;')
      .replace(/,/g, '&#44;')
      .replace(/\./g, '&#46;')
      .replace(/\?/g, '&#63;')
      .replace(/\s/g, (match) => {
        return match === ' ' ? '&nbsp;' : match
      })

    return {
      isValid: true,
      encoded
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Encoding failed'
    }
  }
}

export const decodeHtmlEntities = (text: string): HtmlEntityResult => {
  if (!text.trim()) {
    return {
      isValid: false,
      error: 'Text is empty'
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    const decoded = textarea.value

    return {
      isValid: true,
      decoded
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Decoding failed'
    }
  }
}

