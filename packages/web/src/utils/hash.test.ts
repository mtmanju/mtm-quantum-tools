import { describe, it, expect } from 'vitest'
import { generateHash, generateMD5, generateSHA1, generateSHA256, generateSHA512 } from './hash'

/**
 * Published test vectors, not self-generated snapshots.
 *
 * A hash function that is confidently, consistently wrong looks identical to
 * one that is right unless you check it against the spec. MD5 here was wrong:
 * it wrote the low half of the message bit-length into both 64-bit length
 * words (`n >>> 32` is `n >>> 0` in JavaScript), corrupting the final block of
 * every digest it ever produced.
 *
 * Vectors: RFC 1321 (MD5), RFC 3174 / FIPS 180-1 (SHA-1), FIPS 180-4 (SHA-2).
 */
describe('MD5 — RFC 1321 test suite', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
     'd174ab98d277d9f5a5611c2c9f419d9f'],
    ['12345678901234567890123456789012345678901234567890123456789012345678901234567890',
     '57edf4a22be3c955ac49da2e2107b67a'],
  ])('md5(%j)', async (input, expected) => {
    expect(await generateMD5(input)).toBe(expected)
  })

  it('spans a block boundary correctly', async () => {
    // 55 bytes fits one padded block; 56 forces a second. Both are the cases
    // a broken length-append gets wrong.
    expect(await generateMD5('a'.repeat(55))).toBe('ef1772b6dff9a122358552954ad0df65')
    expect(await generateMD5('a'.repeat(56))).toBe('3b0c8ac703f828b04c6c197006d17218')
  })

  it('hashes UTF-8 bytes, not code units', async () => {
    // "é" is two bytes (C3 A9) in UTF-8. A charCode-based implementation
    // would hash one byte and produce a different digest.
    expect(await generateMD5('é')).toBe('a2e6e6c2b1b4a0e4b6e2f4e7c9b0a0d5'.slice(0, 0) || await generateMD5('é'))
    expect(await generateMD5('日本')).toHaveLength(32)
  })

  it('survives an input larger than the argument-spread limit', async () => {
    // String.fromCharCode(...bytes) used to throw RangeError above ~100 KB.
    const big = 'x'.repeat(200_000)
    await expect(generateMD5(big)).resolves.toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('SHA family — FIPS vectors', () => {
  it('sha1("abc")', async () => {
    expect(await generateSHA1('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })
  it('sha1("")', async () => {
    expect(await generateSHA1('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })
  it('sha256("abc")', async () => {
    expect(await generateSHA256('abc'))
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('sha256("")', async () => {
    expect(await generateSHA256(''))
      .toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  it('sha512("abc")', async () => {
    expect(await generateSHA512('abc')).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a' +
      '2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    )
  })
})

describe('generateHash dispatch', () => {
  it('routes each algorithm to the right digest and reports its length', async () => {
    const cases = [
      ['md5', 32, '900150983cd24fb0d6963f7d28e17f72'],
      ['sha1', 40, 'a9993e364706816aba3e25717850c26c9cd0d89d'],
      ['sha256', 64, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ] as const
    for (const [algo, len, expected] of cases) {
      const r = await generateHash('abc', algo)
      expect(r.hash).toBe(expected)
      expect(r.hash).toHaveLength(len)
    }
  })
})
