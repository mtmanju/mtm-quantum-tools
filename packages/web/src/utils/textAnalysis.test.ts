import { describe, it, expect } from 'vitest'
import { analyzeText, summarizeText, splitSentences, countCharacters } from './textAnalysis'

describe('countCharacters', () => {
  /**
   * `text.length` counts UTF-16 code units, so astral characters counted as 2
   * and ZWJ sequences as more — a character counter reporting 2 for one visible
   * glyph is wrong against the limits people open it to check.
   */
  it.each([
    ['ascii', 'hello', 5],
    ['single emoji', '👍', 1],
    ['emoji in a sentence', 'I love 👍👍 it', 12],
    ['ZWJ family', '👨‍👩‍👧', 1],
    ['skin tone modifier', '👍🏽', 1],
    ['CJK', '日本語', 3],
    ['combining accent', 'é', 1],
    ['empty', '', 0],
  ])('counts %s correctly', (_label, text, expected) => {
    expect(countCharacters(text)).toBe(expected)
  })
})

describe('analyzeText', () => {
  it('does not count a trailing newline as an extra line', () => {
    expect(analyzeText('one\ntwo\n').lines).toBe(2)
    expect(analyzeText('a\nb\nc').lines).toBe(3)
    expect(analyzeText('single').lines).toBe(1)
    expect(analyzeText('a\n\nb\n').lines).toBe(3)
  })

  it('does not split a sentence on an abbreviation or a decimal', () => {
    expect(analyzeText('Dr. Smith went home.').sentences).toBe(1)
    expect(analyzeText('Pi is 3.14 today.').sentences).toBe(1)
    expect(analyzeText('J. R. R. Tolkien wrote it.').sentences).toBe(1)
    expect(analyzeText('The U.S. economy grew.').sentences).toBe(1)
    expect(analyzeText('Version 1.2.3 shipped.').sentences).toBe(1)
  })

  it('still counts real sentence boundaries', () => {
    expect(analyzeText('One. Two. Three.').sentences).toBe(3)
    expect(analyzeText('Hi! How are you? Good.').sentences).toBe(3)
    expect(analyzeText('No terminator here').sentences).toBe(1)
  })

  it('counts characters excluding whitespace by grapheme too', () => {
    const stats = analyzeText('I love 👍👍 it')
    expect(stats.characters).toBe(12)
    expect(stats.charactersNoSpaces).toBe(9)
  })

  it('counts words, paragraphs and reading time', () => {
    const stats = analyzeText('one two three\n\nfour five')
    expect(stats.words).toBe(5)
    expect(stats.paragraphs).toBe(2)
    expect(stats.readingTime).toBe(1)
  })

  it('returns zeroes for blank input', () => {
    expect(analyzeText('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingTime: 0,
    })
  })
})

describe('splitSentences', () => {
  it('keeps each terminator with its sentence', () => {
    expect(splitSentences('Hi! How are you? Good.')).toEqual([
      'Hi!',
      'How are you?',
      'Good.',
    ])
  })

  it('restores protected dots in the returned text', () => {
    expect(splitSentences('Pi is 3.14 today.')).toEqual(['Pi is 3.14 today.'])
    expect(splitSentences('Dr. Smith went home.')).toEqual(['Dr. Smith went home.'])
  })
})

describe('summarizeText', () => {
  /**
   * Two defects in one line. The split discarded each terminator, so questions
   * and exclamations were rebuilt as statements; and the terminal-period
   * ternary was inverted, so it appended a period exactly when one was already
   * needed and omitted it otherwise.
   */
  it('preserves the punctuation each sentence was written with', () => {
    expect(summarizeText('Hi! How are you? Good.')).toBe('Hi! How are you? Good.')
    expect(summarizeText('Really?')).toBe('Really?')
    expect(summarizeText('Stop!')).toBe('Stop!')
  })

  it('adds a terminator only when the text lacks one', () => {
    expect(summarizeText('No terminator here')).toBe('No terminator here.')
  })

  it('limits to maxSentences', () => {
    const out = summarizeText('One. Two. Three. Four. Five.', { maxSentences: 2 })
    expect(out).toBe('One. Two.')
  })

  it('does not lose a word or leave an indent with maxWords', () => {
    // A leading space produced an empty first element which consumed one of the
    // requested words and came back as a leading space.
    expect(summarizeText('  leading space text here more words', { maxWords: 3 })).toBe(
      'leading space text…'
    )
  })

  it('returns the text unchanged when it is already short enough', () => {
    expect(summarizeText('two words', { maxWords: 10 })).toBe('two words')
  })

  it('returns empty for blank input', () => {
    expect(summarizeText('')).toBe('')
    expect(summarizeText('   ')).toBe('')
  })
})
