export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  sentences: number
  paragraphs: number
  lines: number
  readingTime: number // in minutes
}

/**
 * Count what a reader would call characters.
 *
 * `text.length` is a count of UTF-16 code units, so every emoji outside the
 * BMP counted as 2 and a flag or a skin-toned emoji counted as more —
 * "I love 👍👍 it" reported 14 characters for 12 visible ones. That is wrong
 * against every user-facing definition, and against the character limits people
 * open a counter to check.
 *
 * `Intl.Segmenter` counts grapheme clusters, which is the right unit: a family
 * emoji joined by ZWJ is one character to a reader even though it is five code
 * points. Spreading the string is the fallback — better than code units, still
 * wrong for ZWJ sequences — for the rare engine without Segmenter.
 */
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

export const countCharacters = (text: string): number =>
  segmenter ? [...segmenter.segment(text)].length : [...text].length

/**
 * Periods that do not end a sentence.
 *
 * Sentence counting is a heuristic — no rule set is complete — but splitting on
 * every `.` is not a heuristic, it is a guarantee of over-counting: "Dr. Smith
 * went home." was reported as 2 sentences and "Pi is 3.14 today." as 2. Both
 * are one, and prose containing any title, initial, or decimal figure inflated
 * the number the tool exists to report.
 */
const ABBREVIATIONS = [
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'approx',
  'inc', 'ltd', 'co', 'dept', 'est', 'fig', 'vol', 'no', 'al', 'eg', 'ie',
]

/** A Private Use Area codepoint: cannot occur in real text, and is not a control character. */
const PROTECTED_DOT = '\uE000'

const ABBREVIATION_PATTERN = new RegExp(`\\b(${ABBREVIATIONS.join('|')})\\.`, 'gi')

const protectNonTerminalDots = (text: string): string =>
  text
    // Decimals: 3.14, and dotted versions like 1.2.3. The trailing digit is a
    // lookahead rather than part of the match, so consecutive dots each get
    // their turn — consuming it would leave the second dot of "1.2.3" exposed.
    .replace(/(\d)\.(?=\d)/g, `$1${PROTECTED_DOT}`)
    // Initials and dotted acronyms: "J. R. R.", "U.S.A."
    .replace(/\b[A-Z]\./g, m => m.replace('.', PROTECTED_DOT))
    .replace(ABBREVIATION_PATTERN, m => m.replace('.', PROTECTED_DOT))

/**
 * Split into sentences, each keeping its own terminator.
 *
 * Keeping the terminator matters for `summarizeText`: splitting on `[.!?]+`
 * discarded which mark each sentence ended with, so every question and
 * exclamation was rebuilt as a statement.
 */
export const splitSentences = (text: string): string[] =>
  (protectNonTerminalDots(text).match(/[^.!?]+[.!?]*/g) ?? [])
    .map(part => part.split(PROTECTED_DOT).join('.').trim())
    .filter(Boolean)

export const analyzeText = (text: string): TextStats => {
  if (!text.trim()) {
    return {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingTime: 0
    }
  }

  const characters = countCharacters(text)
  const charactersNoSpaces = countCharacters(text.replace(/\s/g, ''))
  const words = text.trim().split(/\s+/).filter(word => word.length > 0).length
  const sentences = splitSentences(text).length
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length

  /**
   * A trailing newline terminates the last line, it does not begin another.
   *
   * `split('\n')` yields an empty final element for text ending in a newline,
   * so "one\ntwo\n" counted 3 lines. Files, log excerpts and editor selections
   * almost always end in a newline, so the count was wrong for the common case
   * and right only for the uncommon one.
   */
  const newlineTerminated = text.endsWith('\n')
  const lines = text.split('\n').length - (newlineTerminated ? 1 : 0)

  const readingTime = Math.ceil(words / 200) // Average reading speed: 200 words per minute

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingTime
  }
}

export interface SummarizeOptions {
  maxSentences?: number
  maxWords?: number
}

export const summarizeText = (text: string, options: SummarizeOptions = {}): string => {
  if (!text.trim()) {
    return ''
  }

  const { maxSentences = 3, maxWords } = options
  const sentences = splitSentences(text)

  if (sentences.length === 0) {
    return text
  }

  if (maxWords) {
    // Trimmed before splitting: leading whitespace previously produced an empty
    // first element, which consumed one of the requested words and came back as
    // a leading space — `maxWords: 3` returned two words and a stray indent.
    const words = text.trim().split(/\s+/)
    if (words.length <= maxWords) {
      return text
    }

    const summary = words.slice(0, maxWords).join(' ')

    // Prefer to end on a real sentence boundary if one falls late enough.
    const lastBoundary = Math.max(
      summary.lastIndexOf('.'),
      summary.lastIndexOf('!'),
      summary.lastIndexOf('?')
    )
    if (lastBoundary > summary.length * 0.5) {
      return summary.substring(0, lastBoundary + 1)
    }

    return summary + '…'
  }

  /**
   * Sentences are rejoined with the punctuation they were written with.
   *
   * This used to be `sentences.join('. ') + (text.endsWith('.') ? '' : '.')`,
   * which was wrong twice over. The split discarded each terminator, so every
   * `!` and `?` came back as `.` — "Hi! How are you? Good." became "Hi. How are
   * you. Good". And the ternary was inverted: the joined string never ends in
   * punctuation, so the branch appending nothing fired exactly when a period
   * was needed, and "Really?" became "Really." while a trailing period went
   * missing.
   */
  const summary = sentences.slice(0, maxSentences).join(' ')
  return /[.!?]$/.test(summary) ? summary : summary + '.'
}
