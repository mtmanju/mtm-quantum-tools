/**
 * dd/mm/yyyy ⇄ ISO conversion.
 *
 * Kept out of the component so the parsing rules can be unit-tested directly,
 * and so DateField.tsx exports only its component.
 */

/** ISO yyyy-mm-dd → dd/mm/yyyy, or '' when not a well-formed ISO date. */
export function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** dd/mm/yyyy → ISO yyyy-mm-dd, or '' when incomplete or not a real date. */
export function dmyToIso(dmy: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy)
  if (!m) return ''
  const [, d, mo, y] = m
  const day = Number(d), month = Number(mo), year = Number(y)
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  const date = new Date(year, month - 1, day)
  /**
   * `new Date(50, 0, 1)` means 1950, not year 50 — the legacy two-digit-year
   * mapping applies to any year below 100, so the round-trip check below
   * rejected every such date while 0100 and up passed. isoToDmy happily
   * produced 01/01/0050, which this then refused: the two halves of one module
   * disagreed about the same date. setFullYear bypasses the mapping.
   */
  date.setFullYear(year)
  // Rejects 31/02/2024 and friends, which Date otherwise rolls forward.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''
  return `${y}-${mo}-${d}`
}

/** Progressively inserts the slashes as digits are typed. */
export function maskDmy(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
