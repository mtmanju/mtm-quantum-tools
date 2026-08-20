import { describe, it, expect } from 'vitest'
import { textToSlug, slugToText } from './slug'

const slug = (t: string, sep?: string) => {
  const r = textToSlug(t, sep)
  if (!r.isValid) throw new Error(r.error)
  return r.slug!
}

/**
 * `[^\w\s-]` deletes anything outside ASCII word characters, so accented
 * letters were dropped rather than folded: "Ünïcödé Tëxt" slugged to
 * "ncd-txt". Four letters silently deleted, and a URL that no longer
 * resembled its title. Every non-English title degraded the same way.
 */
describe('textToSlug — accents fold to base letters', () => {
  it.each([
    ['Ünïcödé Tëxt', 'unicode-text'],
    ['Café Crème', 'cafe-creme'],
    ['Añejo Jalapeño', 'anejo-jalapeno'],
    ['Voilà Déjà Vu', 'voila-deja-vu'],
  ])('%j -> %j', (input, expected) => {
    expect(slug(input)).toBe(expected)
  })
})

describe('textToSlug — shape', () => {
  it('lowercases and joins on the separator', () => {
    expect(slug('Hello World')).toBe('hello-world')
  })
  it('collapses runs of separators and whitespace', () => {
    expect(slug('a--b__c  d')).toBe('a-b-c-d')
  })
  it('drops punctuation', () => {
    expect(slug('Hello, World! (2024)')).toBe('hello-world-2024')
  })
  it('trims leading and trailing separators', () => {
    expect(slug('  --Hello--  ')).toBe('hello')
  })
  it('accepts a custom separator', () => {
    expect(slug('Hello World', '_')).toBe('hello_world')
  })
  it('rejects empty input', () => {
    expect(textToSlug('').isValid).toBe(false)
    expect(textToSlug('   ').isValid).toBe(false)
  })
  it('fails loudly when nothing survives, rather than returning an empty slug', () => {
    expect(textToSlug('日本語').isValid).toBe(false)
  })
})

describe('slugToText', () => {
  it('reverses a simple slug', () => {
    const r = slugToText('hello-world')
    expect(r.isValid).toBe(true)
    // Note: SlugResult carries the output in `slug` for both directions.
    expect(r.slug?.toLowerCase()).toBe('hello world')
  })
})
