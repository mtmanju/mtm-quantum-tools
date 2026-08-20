// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { encodeHtmlEntities, decodeHtmlEntities } from './htmlEntity'

const enc = (s: string) => {
  const r = encodeHtmlEntities(s)
  if (!r.isValid) throw new Error(r.error)
  return r.encoded!
}
const dec = (s: string) => {
  const r = decodeHtmlEntities(s)
  if (!r.isValid) throw new Error(r.error)
  return r.decoded!
}

/**
 * The encoder was a chain of ~30 sequential .replace() calls, and the later
 * ones rewrote the output of the earlier ones — `;` -> `&#59;` ran after
 * `<` -> `&lt;`, so every entity emitted came out with its terminator
 * mangled. It never produced valid HTML for any input containing a
 * significant character.
 */
describe('encodeHtmlEntities', () => {
  it('emits well-formed entities, not doubly-encoded ones', () => {
    expect(enc('<a href="x">&\'</a>'))
      .toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
  })

  it.each([
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['&', '&amp;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
  ])('encodes %j as %j', (input, expected) => {
    expect(enc(input)).toBe(expected)
  })

  it('encodes the ampersand once, not once per later pass', () => {
    expect(enc('&amp;')).toBe('&amp;amp;')
    expect(enc('a & b')).toBe('a &amp; b')
  })

  it('leaves ordinary punctuation alone', () => {
    // The old chain turned these into numeric entities for no reason, and
    // turned every space into &nbsp; — a different character entirely.
    expect(enc('a-b.c,d:e(f)')).toBe('a-b.c,d:e(f)')
    expect(enc('a b')).toBe('a b')
  })

  it('leaves non-ASCII text intact', () => {
    expect(enc('café ☕')).toBe('café ☕')
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes named entities', () => {
    expect(dec('&lt;b&gt;&amp;&quot;')).toBe('<b>&"')
  })

  it('decodes numeric and hex entities', () => {
    expect(dec('&#65;&#x42;')).toBe('AB')
  })

  /**
   * Not asserted here: that decoding markup yields the markup back as text.
   *
   * The decoder assigns to a detached <textarea>'s innerHTML, which a browser
   * parses in RCDATA mode — tags become text and no elements are built. That
   * was verified directly in Chromium, including a `</textarea>` breakout
   * attempt: zero child elements, nothing executed.
   *
   * happy-dom does not reproduce it. Given
   * `<img src=x onerror=...>` it constructs an actual <img> element, so a
   * test written against the emulator would be asserting the emulator's
   * behaviour rather than the browser's — and would report this path as
   * unsafe when in the only environment it ever runs it is not.
   */
})

describe('encode/decode round trip', () => {
  it.each([
    '<a href="x">&\'</a>',
    'a & b < c > d',
    'plain text',
    'café ☕ 日本',
  ])('round trips %j', (input) => {
    expect(dec(enc(input))).toBe(input)
  })
})
