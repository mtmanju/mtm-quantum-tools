import { describe, it, expect } from 'vitest'
import { timestampToDate } from './timestamp'

const utc = (input: string) => timestampToDate(input, 'UTC')

describe('timestampToDate — numeric input', () => {
  it('reads epoch seconds and milliseconds alike', () => {
    expect(utc('0').formatted?.utc).toBe('Thu, 01 Jan 1970 00:00:00 GMT')
    expect(utc('1700000000').formatted?.utc).toBe('Tue, 14 Nov 2023 22:13:20 GMT')
    expect(utc('1700000000000').formatted?.utc).toBe('Tue, 14 Nov 2023 22:13:20 GMT')
  })

  it('handles pre-epoch timestamps', () => {
    expect(utc('-86400').formatted?.utc).toBe('Wed, 31 Dec 1969 00:00:00 GMT')
  })

  it('normalises to seconds in the unix field', () => {
    expect(utc('1700000000000').formatted?.unix).toBe(1700000000)
    expect(utc('1700000000').formatted?.unix).toBe(1700000000)
  })
})

/**
 * The engine rolls an out-of-range *day* forward instead of rejecting it —
 * `new Date('2023-02-29')` is 1 March — so the converter used to report a
 * valid timestamp for a date the user never typed. Out-of-range months are
 * rejected by the engine already, which is why only the day slipped through.
 */
describe('timestampToDate — dates the calendar does not contain', () => {
  it.each([
    ['2023-02-29', 'Feb 29 in a non-leap year'],
    ['2023-04-31', 'April has 30 days'],
    ['2023-06-31', 'June has 30 days'],
    ['1900-02-29', '1900 is not a leap year (century rule)'],
    ['2023-02-29T10:00:00Z', 'rollover in the datetime form too'],
    ['Feb 30 2023', 'textual form'],
  ])('rejects %s — %s', (input) => {
    const r = utc(input)
    expect(r.isValid).toBe(false)
    expect(r.error).toMatch(/not a real calendar date/)
  })

  it('still accepts genuine leap days', () => {
    expect(utc('2024-02-29').formatted?.utc).toBe('Thu, 29 Feb 2024 00:00:00 GMT')
    // 2000 is a leap year: divisible by 400.
    expect(utc('2000-02-29').formatted?.utc).toBe('Tue, 29 Feb 2000 00:00:00 GMT')
  })
})

/**
 * The rollover check must never reject a real date. The textual branch is
 * deliberately narrow for this reason — a converter that refuses valid input
 * is worse than one that tolerates a typo.
 */
describe('timestampToDate — valid formats are not false-rejected', () => {
  it.each([
    '2024-01-01', '2023-12-31', '1970-01-01',
    '2023-06-15T14:30:00Z', '2023-06-15T14:30:00.123Z', '2023-06-15 14:30:00',
    'Jan 1, 2024', 'January 1, 2024', '1 Jan 2024', '15 June 2023', 'Dec 31 2023',
    'Mon, 15 Jun 2023 14:30:00 GMT', '2023/06/15', '06/15/2023',
  ])('accepts %s', (input) => {
    expect(utc(input).isValid).toBe(true)
  })
})

describe('timestampToDate — rejects genuine nonsense', () => {
  it.each(['', 'not a date', '2023-13-01', '2023-00-10'])('rejects %j', (input) => {
    expect(utc(input).isValid).toBe(false)
  })
})
