import { describe, it, expect } from 'vitest'
import { searchTools, type Searchable } from './search'

/** A slice of the real registry, with the keyword index applied. */
const TOOLS: Searchable[] = [
  { id: 'json-formatter', name: 'JSON Formatter', description: 'Beautify & validate JSON instantly', category: 'Essential', keywords: ['beautify', 'prettify', 'pretty print', 'minify', 'validate', 'lint'] },
  { id: 'timestamp-converter', name: 'Timestamp Converter', description: 'Convert timestamps to dates', category: 'Essential', keywords: ['epoch', 'unix time', 'unix timestamp', 'date'] },
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test regex patterns with live highlights', category: 'Code Tools', keywords: ['regexp', 'regular expression', 'pattern', 'match'] },
  { id: 'base64-converter', name: 'Base64 Converter', description: 'Convert files & text to Base64', category: 'Essential', keywords: ['b64', 'encode', 'decode'] },
  { id: 'hash-generator', name: 'Hash Generator', description: 'Generate MD5, SHA-1, SHA-256, SHA-512', category: 'Essential', keywords: ['sha256', 'sha1', 'md5', 'checksum', 'digest'] },
  { id: 'cron-parser', name: 'Cron Parser', description: 'Parse cron & preview next 10 runs', category: 'DevOps', keywords: ['crontab', 'schedule', 'cronjob'] },
  { id: 'css-formatter', name: 'CSS Formatter', description: 'Format & minify CSS', category: 'Formatters', keywords: ['beautify', 'prettify', 'minify'] },
  { id: 'sql-formatter', name: 'SQL Formatter', description: 'Format SQL queries beautifully', category: 'Formatters', keywords: ['beautify', 'prettify', 'query'] },
  { id: 'yaml-formatter', name: 'YAML Formatter', description: 'Format & validate YAML configs', category: 'Formatters', keywords: ['beautify', 'prettify', 'yml'] },
  { id: 'uuid-generator', name: 'UUID Generator', description: 'Create unique identifiers', category: 'Essential', keywords: ['guid', 'unique id', 'v4'] },
  { id: 'jwt-decoder', name: 'JWT Decoder', description: 'Decode & inspect JWT tokens', category: 'Essential', keywords: ['json web token', 'bearer', 'claims'] },
  { id: 'color-converter', name: 'Color Converter', description: 'Convert HEX, RGB, HSL with contrast', category: 'Code Tools', keywords: ['colour', 'hex', 'rgb', 'hsl'] },
]

const ids = (q: string) => searchTools(TOOLS, q).map(t => t.id)
const top = (q: string) => ids(q)[0]

describe('searchTools — queries that previously returned nothing', () => {
  it.each([
    ['epoch', 'timestamp-converter'],
    ['unix time', 'timestamp-converter'],
    ['regexp', 'regex-tester'],
    ['base 64', 'base64-converter'],
    ['crontab', 'cron-parser'],
    ['sha256', 'hash-generator'],
    ['guid', 'uuid-generator'],
    ['colour', 'color-converter'],
  ])('%s finds %s', (query, expected) => {
    expect(ids(query)).toContain(expected)
  })
})

describe('searchTools — typo and abbreviation tolerance', () => {
  it.each([
    ['jsn', 'json-formatter'],
    ['json formater', 'json-formatter'],
    ['jsonfmt', 'json-formatter'],
    ['jwtdec', 'jwt-decoder'],
  ])('%s still ranks %s first', (query, expected) => {
    expect(top(query)).toBe(expected)
  })
})

describe('searchTools — synonyms span every matching tool', () => {
  it('beautify matches all four formatters, not just the ones saying so', () => {
    const found = ids('beautify')
    expect(found).toEqual(expect.arrayContaining([
      'json-formatter', 'css-formatter', 'sql-formatter', 'yaml-formatter',
    ]))
  })

  it('prettify behaves the same as beautify', () => {
    expect(ids('prettify').length).toBeGreaterThanOrEqual(4)
  })
})

describe('searchTools — ranking', () => {
  it('breaks near-ties by registry order, which is curated by importance', () => {
    // "jsn" is a subsequence of both "jsonformatter" and "jsonxml" at identical
    // offsets; without the position bonus the shorter name would win.
    const withXml: Searchable[] = [
      { id: 'json-formatter', name: 'JSON Formatter', description: 'Beautify & validate JSON instantly', category: 'Essential' },
      { id: 'json-xml-converter', name: 'JSON ↔ XML', description: 'Convert between JSON & XML', category: 'Formatters' },
    ]
    expect(searchTools(withXml, 'jsn')[0].id).toBe('json-formatter')
  })

  it('ranks an exact name above a description mention', () => {
    expect(top('json formatter')).toBe('json-formatter')
  })

  it('ranks a name prefix above a mid-word match', () => {
    expect(top('cron')).toBe('cron-parser')
  })

  it('ranks a whole-name match first even when other tools mention the term', () => {
    expect(top('hash generator')).toBe('hash-generator')
  })

  it('surfaces a category as a query', () => {
    expect(ids('formatters').length).toBeGreaterThanOrEqual(3)
  })
})

describe('searchTools — edges', () => {
  it('returns everything for an empty query', () => {
    expect(searchTools(TOOLS, '')).toHaveLength(TOOLS.length)
    expect(searchTools(TOOLS, '   ')).toHaveLength(TOOLS.length)
  })

  it('returns nothing for genuine nonsense', () => {
    expect(ids('zzzqqqxxx')).toHaveLength(0)
  })

  it('ignores case, spacing, hyphens and separators', () => {
    for (const q of ['SHA-256', 'sha 256', 'Sha_256', 'sha.256']) {
      expect(ids(q)).toContain('hash-generator')
    }
  })

  it('never mutates the input array', () => {
    const before = TOOLS.map(t => t.id)
    searchTools(TOOLS, 'json')
    expect(TOOLS.map(t => t.id)).toEqual(before)
  })
})
