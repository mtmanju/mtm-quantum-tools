import { describe, expect, it } from 'vitest'
import { dmyToIso, isoToDmy, maskDmy } from './dateFormat'

describe('isoToDmy', () => {
  it('reorders a well-formed ISO date', () => {
    expect(isoToDmy('2026-08-07')).toBe('07/08/2026')
    expect(isoToDmy('1990-01-31')).toBe('31/01/1990')
  })

  it('returns empty for anything not a full ISO date', () => {
    for (const bad of ['', '2026-8-7', '2026/08/07', '07/08/2026', 'today', '2026-08']) {
      expect(isoToDmy(bad)).toBe('')
    }
  })
})

describe('dmyToIso', () => {
  it('round-trips with isoToDmy', () => {
    for (const iso of ['2026-08-07', '2000-02-29', '1970-01-01', '2099-12-31']) {
      expect(dmyToIso(isoToDmy(iso))).toBe(iso)
    }
  })

  it('rejects dates that do not exist rather than rolling them forward', () => {
    // new Date(2024, 1, 31) silently becomes 2 March — the reason for the
    // explicit component check.
    expect(dmyToIso('31/02/2024')).toBe('')
    expect(dmyToIso('30/02/2024')).toBe('')
    expect(dmyToIso('31/04/2026')).toBe('')
    expect(dmyToIso('29/02/2026')).toBe('') // 2026 is not a leap year
  })

  it('accepts a real leap day', () => {
    expect(dmyToIso('29/02/2024')).toBe('2024-02-29')
  })

  it('rejects out-of-range components', () => {
    expect(dmyToIso('00/01/2026')).toBe('')
    expect(dmyToIso('01/00/2026')).toBe('')
    expect(dmyToIso('01/13/2026')).toBe('')
    expect(dmyToIso('32/01/2026')).toBe('')
  })

  it('returns empty while the value is still incomplete', () => {
    for (const partial of ['', '0', '07', '07/', '07/0', '07/08', '07/08/', '07/08/20']) {
      expect(dmyToIso(partial)).toBe('')
    }
  })

  it('rejects loose shapes that are not exactly dd/mm/yyyy', () => {
    for (const bad of ['7/8/2026', '07-08-2026', '07/08/2026 ', ' 07/08/2026', '07/08/20260']) {
      expect(dmyToIso(bad)).toBe('')
    }
  })
})

describe('maskDmy', () => {
  it('inserts separators as digits arrive', () => {
    expect(maskDmy('0')).toBe('0')
    expect(maskDmy('07')).toBe('07')
    expect(maskDmy('078')).toBe('07/8')
    expect(maskDmy('0708')).toBe('07/08')
    expect(maskDmy('07082')).toBe('07/08/2')
    expect(maskDmy('07082026')).toBe('07/08/2026')
  })

  it('ignores non-digits, so pasting a formatted date still works', () => {
    expect(maskDmy('07/08/2026')).toBe('07/08/2026')
    expect(maskDmy('07-08-2026')).toBe('07/08/2026')
    expect(maskDmy('abc07x08y2026')).toBe('07/08/2026')
  })

  it('caps at eight digits so the field cannot overflow', () => {
    expect(maskDmy('070820261234')).toBe('07/08/2026')
  })

  it('lets a deletion shorten the value', () => {
    expect(maskDmy('07/08/202')).toBe('07/08/202')
    expect(maskDmy('07/0')).toBe('07/0')
  })
})
