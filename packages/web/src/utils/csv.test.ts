import { describe, it, expect } from 'vitest'
import { csvToJson, jsonToCsv } from './csv'

const parse = (csv: string, opts = {}) => {
  const r = csvToJson(csv, opts)
  if (!r.isValid) throw new Error(r.error)
  return JSON.parse(r.json!)
}

describe('csvToJson — RFC 4180 quoting', () => {
  it('keeps a delimiter that sits inside a quoted field', () => {
    expect(parse('name,city\n"Smith, John",NYC')).toEqual([
      { name: 'Smith, John', city: 'NYC' },
    ])
  })

  it('reads "" as an escaped double quote', () => {
    expect(parse('a\n"He said ""hi"""')).toEqual([{ a: 'He said "hi"' }])
  })

  /**
   * The regression this file exists for.
   *
   * The parser split the document on newlines before it knew which newlines
   * were inside quotes, so RFC 4180's own multi-line example came back as two
   * rows — {a:"line1"} and {a:"line2,x"} — with a wrong row count and silently
   * corrupted data. Addresses and free-text notes hit this constantly.
   */
  it('treats a newline inside quotes as data, not a row break', () => {
    const r = csvToJson('a,b\n"line1\nline2",x')
    expect(r.rowCount).toBe(1)
    expect(JSON.parse(r.json!)).toEqual([{ a: 'line1\nline2', b: 'x' }])
  })

  it('handles several quoted newlines in one document', () => {
    expect(parse('a,b\n"1\n2",x\n"3\n4",y')).toEqual([
      { a: '1\n2', b: 'x' },
      { a: '3\n4', b: 'y' },
    ])
  })

  it('accepts CRLF without leaving a stray carriage return', () => {
    expect(parse('a,b\r\n1,2')).toEqual([{ a: '1', b: '2' }])
  })

  it('preserves CRLF inside a quoted field', () => {
    expect(parse('a\r\n"x\r\ny"')).toEqual([{ a: 'x\r\ny' }])
  })
})

describe('csvToJson — shape', () => {
  it('keeps empty fields', () => {
    expect(parse('a,b,c\n1,,3')).toEqual([{ a: '1', b: '', c: '3' }])
  })

  it('pads a short row rather than dropping the column', () => {
    expect(parse('a,b,c\n1,2')).toEqual([{ a: '1', b: '2', c: '' }])
  })

  it('supports a custom delimiter', () => {
    expect(parse('a;b\n1;2', { delimiter: ';' })).toEqual([{ a: '1', b: '2' }])
  })

  it('can treat the first row as data', () => {
    const r = csvToJson('1,2\n3,4', { hasHeaders: false })
    expect(JSON.parse(r.json!)).toEqual([['1', '2'], ['3', '4']])
  })

  it('rejects empty input', () => {
    expect(csvToJson('').isValid).toBe(false)
    expect(csvToJson('   ').isValid).toBe(false)
  })
})

describe('csv round trip', () => {
  it('survives commas, quotes and newlines', () => {
    const original = [{ name: 'Smith, John', note: 'He said "hi"\nand left' }]
    const csv = jsonToCsv(JSON.stringify(original))
    expect(csv.isValid).toBe(true)
    expect(parse(csv.json!)).toEqual(original)
  })
})
