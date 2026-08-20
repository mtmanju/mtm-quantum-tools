export interface HtmlEntityResult {
  isValid: boolean
  encoded?: string
  decoded?: string
  error?: string
}

export const encodeHtmlEntities = (text: string): HtmlEntityResult => {
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
  
  if (!text.trim()) {
    return {
      isValid: false,
      error: 'Text is empty'
    }
  }

  try {
    /**
     * One pass over the input, via a lookup table.
     *
     * This was a chain of ~30 `.replace()` calls, and the later ones rewrote
     * the output of the earlier ones: `;` -> `&#59;` runs after `<` -> `&lt;`,
     * so every entity already emitted had its terminator mangled. `<` came out
     * as `&lt&#59;` and `'` as `&&#35&#59;39&#59;`. Every entity the encoder
     * produced was malformed — the tool never once emitted valid HTML.
     *
     * A single regex pass cannot re-enter its own output, which is the only
     * way to do this correctly.
     *
     * The set is the five characters that are significant in HTML text and
     * attribute contexts, which is what OWASP prescribes for output encoding.
     * The old chain also encoded `-`, `.`, `,`, `:`, `(`, `)` and friends to
     * numeric entities, which no HTML context requires and which made the
     * output unreadable, and turned every space into `&nbsp;` — a
     * non-breaking space is a different character, so encoding was not
     * round-trippable through decode.
     */
    const HTML_ESCAPES: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    const encoded = text.replace(/[&<>"']/g, char => HTML_ESCAPES[char])

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
  
  if (!text.trim()) {
    return {
      isValid: false,
      error: 'Text is empty'
    }
  }

  try {
    // Safety: Check if we're in a browser environment
    if (typeof document === 'undefined') {
      return {
        isValid: false,
        error: 'HTML entity decoding requires browser environment'
      }
    }
    
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    const decoded = textarea.value || textarea.textContent || ''

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

