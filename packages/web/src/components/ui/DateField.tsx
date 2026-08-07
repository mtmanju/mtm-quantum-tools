import { useRef, useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from './Calendar'
import { dmyToIso, isoToDmy, maskDmy } from '../../utils/dateFormat'
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

/**
 * A date field that always reads dd/mm/yyyy.
 *
 * `<input type="date">` renders its format from the *browser's* locale — a US
 * locale draws mm/dd/yyyy — and no attribute or stylesheet can change it, nor
 * can its picker be themed. So this is a masked text input plus our own
 * calendar popover; both paths end up in the same ISO value.
 */
export function DateField({ id, label, value, onChange, max }: DateFieldProps) {
  // `draft` is non-null only while the user is mid-edit; the rest of the time
  // the text is derived from `value`, so outside changes (Reset, the calendar,
  // a paste handoff) show up without an effect syncing two sources of truth.
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const text = draft ?? isoToDmy(value)

  const handleText = (raw: string) => {
    const masked = maskDmy(raw)
    setDraft(masked)
    const iso = dmyToIso(masked)
    // Only publish complete, real dates; partial typing must not clear results.
    if (iso) onChange(iso)
    else if (!masked) onChange('')
  }

  // Hand control back to `value` on blur — unless what they typed is a complete
  // but impossible date, which stays on screen so the error still points at it.
  const handleBlur = () => {
    setDraft(d => (d && d.length === 10 && !dmyToIso(d) ? d : null))
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
          onBlur={handleBlur}
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
              setDraft(null)
            }}
          />
        )}
      </div>

      {/* The format is already shown by the placeholder and enforced by the
          mask, so repeating it under the field is noise. It stays in the
          accessibility tree, where the placeholder is not reliably announced,
          and becomes visible only when it has something to say. */}
      <span
        id={`${id}-hint`}
        className={`datefield-hint ${invalid ? '' : 'visually-hidden'}`}
      >
        {invalid ? 'Not a real date' : 'Format: dd/mm/yyyy'}
      </span>
    </div>
  )
}
