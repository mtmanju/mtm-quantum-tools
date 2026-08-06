import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Calendar.css'

interface CalendarProps {
  /** ISO yyyy-mm-dd, or '' when nothing is selected. */
  value: string
  onSelect: (iso: string) => void
  onClose: () => void
  /** ISO upper bound; later dates are not selectable. */
  max?: string
  /**
   * The element that opened this popover. Clicks on it must NOT count as
   * "outside", or the mousedown closes the popover and the button's own click
   * handler immediately toggles it back open.
   */
  anchor?: React.RefObject<HTMLElement | null>
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const toIso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const parseIso = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null
}

/** Monday-first index for a given JS day-of-week (0=Sun). */
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7

/**
 * A calendar that matches the rest of the app.
 *
 * The native picker is styled entirely by the browser and cannot be themed —
 * it also buries year selection behind month-by-month paging, which is
 * unusable for a birth date thirty years back. Month and year are dropdowns
 * here for exactly that reason.
 */
export function Calendar({ value, onSelect, onClose, max, anchor }: CalendarProps) {
  const selected = parseIso(value)
  const today = new Date()
  const maxDate = max ? parseIso(max) : null

  const [viewYear, setViewYear] = useState(selected?.y ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.m ?? today.getMonth())
  const rootRef = useRef<HTMLDivElement>(null)

  // Dismiss on outside click or Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (anchor?.current?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, anchor])

  const years = useMemo(() => {
    const last = maxDate ? maxDate.y : today.getFullYear() + 10
    const first = last - 130
    return Array.from({ length: last - first + 1 }, (_, i) => last - i)
  }, [maxDate, today])

  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const leading = mondayIndex(firstOfMonth.getDay())
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: Array<number | null> = Array(leading).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  const isAfterMax = (d: number) => {
    if (!maxDate) return false
    if (viewYear !== maxDate.y) return viewYear > maxDate.y
    if (viewMonth !== maxDate.m) return viewMonth > maxDate.m
    return d > maxDate.d
  }

  const step = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return (
    <div className="cal" ref={rootRef} role="dialog" aria-label="Choose a date">
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={() => step(-1)} aria-label="Previous month">
          <ChevronLeft size={15} />
        </button>

        <div className="cal-selects">
          <select
            className="cal-select"
            value={viewMonth}
            onChange={e => setViewMonth(Number(e.target.value))}
            aria-label="Month"
          >
            {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
          </select>
          <select
            className="cal-select"
            value={viewYear}
            onChange={e => setViewYear(Number(e.target.value))}
            aria-label="Year"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button type="button" className="cal-nav" onClick={() => step(1)} aria-label="Next month">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
      </div>

      <div className="cal-grid">
        {grid.map((day, i) => {
          if (day === null) return <span key={i} className="cal-cell is-empty" />
          const isSelected =
            !!selected && selected.y === viewYear && selected.m === viewMonth && selected.d === day
          const isToday =
            today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
          const disabled = isAfterMax(day)
          return (
            <button
              key={i}
              type="button"
              className={`cal-cell${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
              disabled={disabled}
              onClick={() => { onSelect(toIso(viewYear, viewMonth, day)); onClose() }}
              aria-current={isToday ? 'date' : undefined}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="cal-footer">
        <button
          type="button"
          className="cal-today-btn"
          onClick={() => {
            const t = new Date()
            if (max && toIso(t.getFullYear(), t.getMonth(), t.getDate()) > max) return
            onSelect(toIso(t.getFullYear(), t.getMonth(), t.getDate()))
            onClose()
          }}
        >
          Today
        </button>
        <button type="button" className="cal-clear-btn" onClick={() => { onSelect(''); onClose() }}>
          Clear
        </button>
      </div>
    </div>
  )
}
