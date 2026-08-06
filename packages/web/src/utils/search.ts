/**
 * Tool search: subsequence-based fuzzy matching over a keyword index.
 *
 * Plain `String.includes` was missing tools users obviously meant — `epoch`,
 * `regexp`, `crontab`, `sha256` and `base 64` all returned nothing despite the
 * tool existing (`sha256` failed because the description says "SHA-256", and
 * the hyphen broke the substring match). Developers also type abbreviations
 * and typos: `jsnfmt`, `json formater`.
 *
 * The matcher is a subsequence test — every query character must appear in
 * order, not necessarily adjacently — scored so that contiguous runs and
 * word-boundary hits rank above scattered ones.
 */

export interface Searchable {
  id: string
  name: string
  description: string
  category: string
  /** Synonyms, abbreviations and alternate spellings. */
  keywords?: string[]
}

interface ScoredResult<T> {
  item: T
  score: number
  /** Position in the source registry, used to break near-ties. */
  index: number
}

/** Characters that shouldn't affect matching: "SHA-256" must match "sha256". */
const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_./]+/g, '')

/**
 * Score `query` against `text`, both already normalized.
 * Returns 0 when the query is not a subsequence of the text.
 */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 0
  if (text === query) return 1000
  if (text.startsWith(query)) return 900 - (text.length - query.length)

  const idx = text.indexOf(query)
  if (idx !== -1) return 700 - idx * 2 - (text.length - query.length)

  // Subsequence walk, rewarding consecutive matches.
  let ti = 0
  let score = 0
  let run = 0
  for (let qi = 0; qi < query.length; qi++) {
    const ch = query[qi]
    const found = text.indexOf(ch, ti)
    if (found === -1) return 0
    run = found === ti && qi > 0 ? run + 1 : 0
    score += 10 + run * 8 - Math.min(found - ti, 10)
    ti = found + 1
  }
  // Prefer shorter targets, so "JWT Decoder" beats a long description.
  return Math.max(1, score - Math.floor(text.length / 4))
}

/** Field weights — a name hit should always outrank a description hit. */
const WEIGHTS = { name: 3, keywords: 2.2, category: 1.2, description: 1 } as const

export function searchTools<T extends Searchable>(tools: T[], rawQuery: string): T[] {
  const query = normalize(rawQuery)
  if (!query) return tools

  const results: ScoredResult<T>[] = []

  tools.forEach((tool, index) => {
    const nameScore = fuzzyScore(query, normalize(tool.name)) * WEIGHTS.name
    const catScore = fuzzyScore(query, normalize(tool.category)) * WEIGHTS.category
    const descScore = fuzzyScore(query, normalize(tool.description)) * WEIGHTS.description

    let kwScore = 0
    for (const kw of tool.keywords ?? []) {
      kwScore = Math.max(kwScore, fuzzyScore(query, normalize(kw)) * WEIGHTS.keywords)
    }

    const score = Math.max(nameScore, kwScore, catScore, descScore)
    if (score > 0) results.push({ item: tool, score, index })
  })

  /**
   * Results within TIE_TOLERANCE of each other are treated as equally relevant
   * and fall back to registry order, which is hand-curated by how commonly a
   * tool is reached. Without this, an abbreviation like "jsn" ranks
   * "JSON ↔ XML" above "JSON Formatter" purely because the name is shorter —
   * the two are equally good literal matches, so the tiebreak should be
   * editorial rather than incidental.
   */
  const TIE_TOLERANCE = 0.1 // 10% relative

  return results
    .sort((a, b) => {
      const relative = Math.abs(a.score - b.score) / Math.max(a.score, b.score)
      if (relative <= TIE_TOLERANCE) return a.index - b.index
      return b.score - a.score
    })
    .map(r => r.item)
}
