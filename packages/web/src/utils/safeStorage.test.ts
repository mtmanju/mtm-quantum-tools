import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readStorage, writeStorage, readStringArray } from './safeStorage'
import { readRecentTools, recordRecentTool } from './recentTools'

const RECENTS_KEY = 'qt-recent-tools'

/** Swap in a storage implementation for one test. */
const useStorage = (impl: Partial<Storage>) => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: impl,
    configurable: true,
    writable: true,
  })
}

const memoryStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as unknown as Storage
}

/** Blocked cookies / sandboxed iframe: every access throws SecurityError. */
const throwingStorage = () =>
  ({
    getItem: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
    setItem: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  }) as unknown as Storage

const original = globalThis.localStorage

beforeEach(() => useStorage(memoryStorage()))
afterEach(() => useStorage(original))

describe('readStorage / writeStorage', () => {
  it('round-trips a value', () => {
    writeStorage('k', 'v')
    expect(readStorage('k')).toBe('v')
  })

  it('returns null instead of throwing when storage is blocked', () => {
    useStorage(throwingStorage())
    expect(() => readStorage('theme')).not.toThrow()
    expect(readStorage('theme')).toBeNull()
  })

  it('swallows a failed write rather than throwing', () => {
    useStorage(throwingStorage())
    expect(() => writeStorage('theme', 'dark')).not.toThrow()
  })

  it('survives a quota-exceeded write', () => {
    useStorage({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      },
    } as unknown as Storage)
    expect(() => writeStorage('k', 'v')).not.toThrow()
  })
})

describe('readStringArray', () => {
  it('reads a well-formed array', () => {
    writeStorage('k', JSON.stringify(['a', 'b']))
    expect(readStringArray('k')).toEqual(['a', 'b'])
  })

  it.each([
    ['a JSON string', '"json-formatter"'],
    ['a JSON number', '42'],
    ['a JSON object', '{"a":1}'],
    ['JSON null', 'null'],
    ['invalid JSON', '{oops'],
  ])('returns an array for %s', (_label, stored) => {
    writeStorage('k', stored)
    const result = readStringArray('k')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toEqual([])
  })

  it('drops non-string members of an array', () => {
    writeStorage('k', JSON.stringify(['a', 1, null, { b: 2 }, 'c']))
    expect(readStringArray('k')).toEqual(['a', 'c'])
  })
})

describe('readRecentTools', () => {
  /**
   * The failure this guards: a stored JSON *string* parsed without throwing,
   * `String.prototype.slice` succeeded, and a string was returned from a
   * function declared `string[]`. The caller's `.map()` then threw during
   * render — a white screen that reloading could not clear.
   */
  it('returns an array even when storage holds a bare JSON string', () => {
    writeStorage(RECENTS_KEY, '"json-formatter"')
    const recents = readRecentTools()
    expect(Array.isArray(recents)).toBe(true)
    expect(() => recents.map(x => x)).not.toThrow()
  })

  it('returns an array when storage is blocked entirely', () => {
    useStorage(throwingStorage())
    expect(readRecentTools()).toEqual([])
  })

  it('records most-recent-first, without duplicates, capped at five', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) recordRecentTool(id)
    expect(readRecentTools()).toEqual(['f', 'e', 'd', 'c', 'b'])

    recordRecentTool('c')
    expect(readRecentTools()).toEqual(['c', 'f', 'e', 'd', 'b'])
  })

  it('does not throw when recording into blocked storage', () => {
    useStorage(throwingStorage())
    expect(() => recordRecentTool('json-formatter')).not.toThrow()
  })
})
