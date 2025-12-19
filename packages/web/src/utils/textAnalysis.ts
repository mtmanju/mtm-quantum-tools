export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  sentences: number
  paragraphs: number
  lines: number
  readingTime: number // in minutes
}

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

  const characters = text.length
  const charactersNoSpaces = text.replace(/\s/g, '').length
  const words = text.trim().split(/\s+/).filter(word => word.length > 0).length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
  const lines = text.split('\n').length
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

  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (sentences.length === 0) {
    return text
  }

  // If maxWords is specified, use word-based summarization
  if (maxWords) {
    const words = text.split(/\s+/)
    if (words.length <= maxWords) {
      return text
    }
    
    // Take first N words
    const summaryWords = words.slice(0, maxWords)
    let summary = summaryWords.join(' ')
    
    // Try to end at a sentence boundary
    const lastSentenceEnd = summary.lastIndexOf('.')
    if (lastSentenceEnd > summary.length * 0.5) {
      summary = summary.substring(0, lastSentenceEnd + 1)
    }
    
    return summary + (summary.endsWith('.') ? '' : '...')
  }

  // Sentence-based summarization
  if (sentences.length <= maxSentences) {
    return sentences.join('. ') + (text.endsWith('.') ? '' : '.')
  }

  // Take first N sentences
  const summary = sentences.slice(0, maxSentences).join('. ')
  return summary + '.'
}

