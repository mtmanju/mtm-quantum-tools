import { describe, it, expect } from 'vitest'
import {
  encodeToBase64,
  decodeFromBase64,
  bytesToBase64,
  base64ToBlob,
  formatBase64,
  minifyBase64,
} from './base64'

/**
 * A real 1×1 red PNG. Binary, contains bytes outside the ASCII range, and has
 * a recognisable magic number — so it exercises the paths that a naïve
 * string-based implementation gets wrong.
 */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const PNG_BYTES = Uint8Array.from(atob(PNG_BASE64), c => c.charCodeAt(0))

describe('encodeToBase64 / decodeFromBase64 — text', () => {
  it.each([
    ['Hello, World!', 'SGVsbG8sIFdvcmxkIQ=='],
    ['username:password', 'dXNlcm5hbWU6cGFzc3dvcmQ='],
    ['{"name":"Alice","active":true}', 'eyJuYW1lIjoiQWxpY2UiLCJhY3RpdmUiOnRydWV9'],
  ])('encodes %s', (text, expected) => {
    expect(encodeToBase64(text)).toBe(expected)
  })

  it('round-trips non-ASCII text without corruption', () => {
    for (const text of ['héllo wörld', '日本語のテキスト', '🎉 emoji 🚀', 'Ω≈ç√∫˜µ']) {
      const decoded = decodeFromBase64(encodeToBase64(text))
      expect(decoded.isValid).toBe(true)
      expect(decoded.decoded).toBe(text)
    }
  })

  it('round-trips an empty-ish and a long string', () => {
    const long = 'A'.repeat(10_000)
    const decoded = decodeFromBase64(encodeToBase64(long))
    expect(decoded.decoded).toBe(long)
  })
})

describe('binary payloads', () => {
  it('encodes raw bytes to the canonical Base64 of a real PNG', () => {
    expect(bytesToBase64(PNG_BYTES)).toBe(PNG_BASE64)
  })

  it('decodes a PNG back to byte-identical content', () => {
    const result = decodeFromBase64(PNG_BASE64)
    expect(result.isValid).toBe(true)
    expect(result.decodedBytes).toBeDefined()
    expect(Array.from(result.decodedBytes!)).toEqual(Array.from(PNG_BYTES))
  })

  it('detects the PNG magic number as an image MIME type', () => {
    const result = decodeFromBase64(PNG_BASE64)
    expect(result.mimeType).toMatch(/^image\/png$/)
  })

  it('accepts a data URL prefix and ignores it', () => {
    const result = decodeFromBase64(`data:image/png;base64,${PNG_BASE64}`)
    expect(result.isValid).toBe(true)
    expect(Array.from(result.decodedBytes!)).toEqual(Array.from(PNG_BYTES))
  })

  it('survives Base64 that has been wrapped at 76 columns', () => {
    // This is what the UI shows after "Format", and what users paste back in.
    const wrapped = formatBase64(PNG_BASE64)
    expect(wrapped).toContain('\n')
    const result = decodeFromBase64(wrapped)
    expect(result.isValid).toBe(true)
    expect(Array.from(result.decodedBytes!)).toEqual(Array.from(PNG_BYTES))
  })

  it('builds a Blob of the right size and type', () => {
    const blob = base64ToBlob(PNG_BASE64, 'image/png')
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(PNG_BYTES.length)
  })
})

describe('formatBase64 / minifyBase64', () => {
  const long = bytesToBase64(new Uint8Array(300).fill(65))

  it('wraps at 76 characters by default', () => {
    const lines = formatBase64(long).split('\n')
    expect(lines.every(l => l.length <= 76)).toBe(true)
    expect(lines.length).toBeGreaterThan(1)
  })

  it('is a lossless round trip — this is what the Format/Minify toggle relies on', () => {
    expect(minifyBase64(formatBase64(long))).toBe(long)
    expect(minifyBase64(formatBase64(minifyBase64(formatBase64(long))))).toBe(long)
  })

  it('strips every kind of whitespace', () => {
    expect(minifyBase64('SGVs\nbG8s\r\n IFdv  \tcmxkIQ==')).toBe('SGVsbG8sIFdvcmxkIQ==')
  })
})

describe('decodeFromBase64 — invalid input', () => {
  it('rejects input with no Base64 characters at all', () => {
    const result = decodeFromBase64('!!!___!!!')
    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects empty input', () => {
    expect(decodeFromBase64('').isValid).toBe(false)
  })
})


describe('decodeFromBase64 — RFC 4648 strictness', () => {
  // RFC 4648 §10 test vectors.
  it.each([
    ['Zg==', 'f'],
    ['Zm8=', 'fo'],
    ['Zm9v', 'foo'],
    ['Zm9vYg==', 'foob'],
    ['Zm9vYmE=', 'fooba'],
    ['Zm9vYmFy', 'foobar'],
  ])('decodes %o to %o', (input, expected) => {
    expect(decodeFromBase64(input).decoded).toBe(expected)
  })

  it.each([
    ['', 'f', 'Zg=='],
    ['', 'fo', 'Zm8='],
    ['', 'foobar', 'Zm9vYmFy'],
  ])('encodes %s%o as %o', (_pad, input, expected) => {
    expect(encodeToBase64(input)).toBe(expected)
  })

  /**
   * §3.3: a decoder MUST reject data containing characters outside the base
   * alphabet. This used to delete them and carry on, so a corrupted or partial
   * paste produced plausible output and reported success — precisely what a
   * decoder exists to catch.
   */
  it.each([
    ['non-alphabet characters', 'aGVsbG8h!!!'],
    ['an embedded dollar sign', 'Zm9v$YmFy'],
    ['a comma', 'Zm9v,YmFy'],
    ['padding in the middle', 'SGVsbG8=world'],
    ['two concatenated encodings', 'Zg==Zg=='],
    ['too much padding', '===='],
  ])('rejects %s', (_label, input) => {
    const result = decodeFromBase64(input)
    expect(result.isValid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects an impossible length', () => {
    // 4 characters encode 3 bytes, so a remainder of 1 cannot occur.
    expect(decodeFromBase64('Zm9vY').isValid).toBe(false)
  })

  it('accepts unpadded input, which is unambiguous', () => {
    expect(decodeFromBase64('Zm9vYg').decoded).toBe('foob')
    expect(decodeFromBase64('Zm8').decoded).toBe('fo')
  })

  it('strips a real data-URL prefix but not an arbitrary comma', () => {
    expect(decodeFromBase64('data:text/plain;base64,Zm9vYmFy').decoded).toBe('foobar')
    // `base64.includes(',') ? split(',')[1] : base64` truncated at any comma.
    expect(decodeFromBase64('Zm9v,YmFy').isValid).toBe(false)
  })

  it('round-trips a large payload without throwing', () => {
    const large = 'a'.repeat(120_000)
    expect(decodeFromBase64(encodeToBase64(large)).decoded).toBe(large)
  })
})
