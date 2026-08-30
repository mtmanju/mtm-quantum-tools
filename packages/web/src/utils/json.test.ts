import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson, validateJson } from './json'
import { isoToDmy, dmyToIso, maskDmy } from './dateFormat'

describe('formatJson / minifyJson', () => {
  /**
   * The guard was `!validation.isValid || !validation.parsed`, so a
   * successfully parsed falsy value failed it. RFC 8259 §2: "A JSON text is a
   * serialized value" — any value, scalars included — so these are valid
   * documents that came back unprocessed.
   */
  it.each([
    ['  0  ', '0'],
    ['  false  ', 'false'],
    [' null ', 'null'],
    ['  ""  ', '""'],
    ['  true  ', 'true'],
  ])('formats the falsy-but-valid document %o', (input, expected) => {
    expect(formatJson(input)).toBe(expected)
    expect(minifyJson(input)).toBe(expected)
  })

  it('still formats and minifies objects and arrays', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
    expect(formatJson('[]')).toBe('[]')
    expect(minifyJson('[1, 2]')).toBe('[1,2]')
  })

  it('returns invalid input unchanged', () => {
    expect(formatJson('{oops')).toBe('{oops')
    expect(minifyJson('{oops')).toBe('{oops')
  })

  it('still rejects trailing commas per RFC 8259 §4', () => {
    expect(validateJson('{"a":1,}').isValid).toBe(false)
  })
})

describe('dateFormat', () => {
  /**
   * `new Date(50, 0, 1)` is 1950, not year 50 — the legacy two-digit-year
   * mapping applies below 100, so the round-trip check rejected every such
   * date while isoToDmy happily produced one. The two halves of the module
   * disagreed about the same date.
   */
  it.each(['0050-01-01', '0001-01-01', '0099-12-31', '0100-01-01'])(
    'round-trips the early year %s',
    iso => {
      expect(dmyToIso(isoToDmy(iso))).toBe(iso)
    }
  )

  it.each(['1999-12-31', '2024-02-29', '2000-01-01'])('round-trips %s', iso => {
    expect(dmyToIso(isoToDmy(iso))).toBe(iso)
  })

  it('still rejects dates that do not exist', () => {
    expect(dmyToIso('31/02/2024')).toBe('')
    expect(dmyToIso('29/02/2023')).toBe('')
    expect(dmyToIso('32/01/2024')).toBe('')
    expect(dmyToIso('00/01/2024')).toBe('')
    expect(dmyToIso('01/13/2024')).toBe('')
  })

  it('returns empty for malformed input', () => {
    expect(isoToDmy('not-a-date')).toBe('')
    expect(dmyToIso('1/1/2024')).toBe('')
    expect(dmyToIso('')).toBe('')
  })

  it('masks digits progressively as they are typed', () => {
    expect(maskDmy('0')).toBe('0')
    expect(maskDmy('01')).toBe('01')
    expect(maskDmy('0102')).toBe('01/02')
    expect(maskDmy('01022024')).toBe('01/02/2024')
    expect(maskDmy('010220249999')).toBe('01/02/2024')
  })
})
