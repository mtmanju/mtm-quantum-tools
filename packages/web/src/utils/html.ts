/**
 * HTML formatting utilities
 */

/**
 * Formats HTML with proper indentation
 */
export const formatHtml = (html: string): string => {
  if (!html.trim()) return ''

  let formatted = ''
  let indent = 0
  const indentSize = 2

  // Remove existing whitespace between tags
  html = html.replace(/>\s+</g, '><')

  // Split by tags
  const tokens = html.split(/(<[^>]+>)/)

  for (const token of tokens) {
    if (!token.trim()) continue

    if (token.startsWith('</')) {
      // Closing tag
      indent--
      formatted += ' '.repeat(indent * indentSize) + token + '\n'
    } else if (token.startsWith('<')) {
      // Opening tag
      formatted += ' '.repeat(indent * indentSize) + token + '\n'
      // Check if it's a self-closing tag
      if (!token.match(/\/\s*>$/)) {
        indent++
      }
    } else {
      // Text content
      const trimmed = token.trim()
      if (trimmed) {
        formatted += ' '.repeat(indent * indentSize) + trimmed + '\n'
      }
    }
  }

  return formatted.trim()
}

/**
 * Minifies HTML (removes whitespace)
 */
/**
 * Elements whose contents are whitespace-significant, or are not HTML at all.
 * Their inner text has to survive minification byte for byte.
 */
const PRESERVED_HTML = /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi

export const minifyHtml = (html: string): string => {
  if (!html.trim()) return ''

  /**
   * Lift the whitespace-significant regions out before collapsing anything.
   *
   * `<pre>  keep\n  me  </pre>` used to minify to `<pre> keep me </pre>` —
   * `<pre>` means "this whitespace is the content", so collapsing it changes
   * what the page renders. `<textarea>` has the same property, and `<script>`
   * and `<style>` are not HTML at all: collapsing whitespace inside a script
   * can join a `//` comment to the code after it.
   */
  // Sentinel is a Private Use Area codepoint: it cannot appear in real
  // markup, and unlike U+0000 it is not a control character, which a regex
  // has no business containing.
  const preserved: string[] = []
  const withPlaceholders = html.replace(PRESERVED_HTML, match => {
    preserved.push(match)
    return `\uE000PRESERVED${preserved.length - 1}\uE000`
  })

  const minified = withPlaceholders
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    // NOT stripping spaces around { } : ; , here.
    //
    // The previous implementation did, which is a CSS minifier's rule applied
    // to HTML: it ran over visible text, so "Hello, world" minified to
    // "Hello,world" and "Ratio: 3" to "Ratio:3". In HTML those characters are
    // ordinary text and the spaces beside them are content.
    .trim()

  return minified.replace(
    /\uE000PRESERVED(\d+)\uE000/g,
    (_, index: string) => preserved[Number(index)]
  )
}

/**
 * Validates basic HTML structure
 */
export const validateHtml = (html: string): { isValid: boolean; error?: string } => {
  if (!html.trim()) {
    return {
      isValid: false,
      error: 'Please enter HTML content'
    }
  }

  // Check for balanced tags (basic check)
  const openTags = (html.match(/<[^/!?][^>]*>/g) || []).length
  const closeTags = (html.match(/<\/[^>]+>/g) || []).length

  // This is a simple check - real HTML validation is more complex
  if (openTags < closeTags) {
    return {
      isValid: false,
      error: 'More closing tags than opening tags'
    }
  }

  return {
    isValid: true
  }
}

