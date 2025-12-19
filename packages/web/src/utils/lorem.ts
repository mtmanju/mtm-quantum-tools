const LATIN_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
  'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
  'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id',
  'est', 'laborum'
]

const ENGLISH_WORDS = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'pack', 'my', 'box', 'with', 'five', 'dozen', 'liquor', 'jugs',
  'how', 'vexingly', 'quick', 'daft', 'zebras', 'jump', 'waltz', 'bad', 'nymph', 'for', 'jived', 'quicks', 'sphinx', 'of', 'black', 'quartz',
  'jaded', 'zombies', 'acted', 'quaintly', 'but', 'kept', 'driving', 'their', 'oxen', 'forward', 'five', 'boxing', 'wizards', 'jump', 'quickly',
  'amazingly', 'few', 'discotheques', 'provide', 'jukeboxes', 'when', 'zombies', 'arrive', 'quickly', 'fax', 'jury', 'pat', 'waltz', 'gymnast',
  'bright', 'vixens', 'jump', 'dozy', 'fowl', 'quack', 'sphinx', 'of', 'black', 'quartz', 'judge', 'my', 'vow'
]

export type LoremTextType = 'latin' | 'english'

export const generateLoremIpsum = (
  type: 'words' | 'sentences' | 'paragraphs',
  count: number,
  textType: LoremTextType = 'latin'
): string => {
  if (count <= 0) return ''
  
  const wordList = textType === 'latin' ? LATIN_WORDS : ENGLISH_WORDS
  
  const getRandomWord = () => {
    return wordList[Math.floor(Math.random() * wordList.length)]
  }
  
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  
  const generateSentence = (): string => {
    const wordCount = Math.floor(Math.random() * 10) + 8 // 8-17 words
    const words: string[] = []
    
    for (let i = 0; i < wordCount; i++) {
      words.push(getRandomWord())
    }
    
    return capitalize(words.join(' ')) + '.'
  }
  
  const generateParagraph = (): string => {
    const sentenceCount = Math.floor(Math.random() * 3) + 3 // 3-5 sentences
    const sentences: string[] = []
    
    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(generateSentence())
    }
    
    return sentences.join(' ')
  }
  
  switch (type) {
    case 'words': {
      const words: string[] = []
      for (let i = 0; i < count; i++) {
        words.push(getRandomWord())
      }
      return capitalize(words.join(' '))
    }
    
    case 'sentences': {
      const sentences: string[] = []
      for (let i = 0; i < count; i++) {
        sentences.push(generateSentence())
      }
      return sentences.join(' ')
    }
    
    case 'paragraphs': {
      const paragraphs: string[] = []
      for (let i = 0; i < count; i++) {
        paragraphs.push(generateParagraph())
      }
      return paragraphs.join('\n\n')
    }
  }
}

