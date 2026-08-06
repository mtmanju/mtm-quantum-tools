import { useEffect, useRef, useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from './Calendar'
import './DateField.css'

interface DateFieldProps {
  id: string
  label: string
  /** ISO yyyy-mm-dd, or '' when empty. */
  value: string
  onChange: (iso: string) => void
  /** ISO yyyy-mm-dd upper bound, e.g. today. */
  max?: string
}

/** ISO yyyy-mm-dd → dd/mm/yyyy */
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
  // Rejects 31/02/2024 and friends, which Date otherwise rolls forward.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return ''
  return `${y}-${mo}-${d}`
}

/** Progressively inserts the slashes as digits are typed. */
function maskDmy(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * A date field that always reads dd/mm/yyyy.
 *
 * `<input type="date">` renders its format from the *browser's* locale — a US
 * locale draws mm/dd/yyyy — and no attribute or stylesheet can change it, nor
 * can its picker be themed. So this is a masked text input plus our own
 * calendar popover; both paths end up in the same ISO value.
 */
export function DateField({ id, label, value, onChange, max }: DateFieldProps) {
  const [text, setText] = useState(() => isoToDmy(value))
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Follow the value when it changes from outside (Reset, paste handoff).
  useEffect(() => {
    const next = isoToDmy(value)
    setText(prev => (dmyToIso(prev) === value ? prev : next))
  }, [value])

  const handleText = (raw: string) => {
    const masked = maskDmy(raw)
    setText(masked)
    const iso = dmyToIso(masked)
    // Only publish complete, real dates; partial typing must not clear results.
    if (iso) onChange(iso)
    else if (!masked) onChange('')
  }

  const complete = text.length === 10
  const invalid = complete && !dmyToIso(text)

  return (
    <div className="datefield">
      <label className="datefield-label" htmlFor={id}>{label}</label>

      <div className={`datefield-control ${invalid ? 'is-invalid' : ''}`}>
        <input
          id={id}
          type="text"
          className="datefield-input"
          value={text}
          onChange={e => handleText(e.target.value)}
          placeholder="dd/mm/yyyy"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={10}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint`}
        />
        <button
          ref={triggerRef}
          type="button"
          className="datefield-picker-btn"
          onClick={() => setOpen(o => !o)}
          aria-label={`Open calendar for ${label}`}
          aria-expanded={open}
        >
          <CalendarIcon size={14} aria-hidden="true" />
        </button>

        {open && (
          <Calendar
            value={value}
            max={max}
            anchor={triggerRef}
            onClose={() => setOpen(false)}
            onSelect={iso => {
              onChange(iso)
              setText(isoToDmy(iso))
            }}
          />
        )}
      </div>

      <span id={`${id}-hint`} className="datefield-hint">
        {invalid ? 'Not a real date' : 'dd/mm/yyyy'}
      </span>
    </div>
  )
}
