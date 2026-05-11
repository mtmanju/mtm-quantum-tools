import { AlignLeft, Calendar, Check, Clock, Copy, FileDown, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { downloadTextFile } from '../utils/file'
import './CronParser.css'

// ---------------------------------------------------------------------------
// Cron parsing utilities (no external library)
// ---------------------------------------------------------------------------

function resolveValue(s: string, names?: Record<string, number>): number {
  if (names) {
    const lower = s.toLowerCase()
    if (names[lower] !== undefined) return names[lower]
  }
  const n = parseInt(s, 10)
  if (isNaN(n)) throw new Error(`Invalid value: "${s}"`)
  return n
}

function parseCronField(
  field: string,
  min: number,
  max: number,
  names?: Record<string, number>
): number[] {
  const values = new Set<number>()

  for (const part of field.split(',')) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i)
    } else if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/')
      const step = parseInt(stepStr, 10)
      if (isNaN(step) || step < 1) throw new Error(`Invalid step in "${part}"`)
      let start = min
      let end = max
      if (rangeStr !== '*') {
        const range = rangeStr.split('-')
        start = resolveValue(range[0], names)
        end = range.length > 1 ? resolveValue(range[1], names) : start
      }
      for (let i = start; i <= end; i += step) values.add(i)
    } else if (part.includes('-')) {
      const [s, e] = part.split('-')
      const start = resolveValue(s, names)
      const end = resolveValue(e, names)
      for (let i = start; i <= end; i++) values.add(i)
    } else {
      values.add(resolveValue(part, names))
    }
  }

  return [...values].filter(v => v >= min && v <= max).sort((a, b) => a - b)
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

interface ParsedCron {
  minutes: number[]
  hours: number[]
  doms: number[]
  months: number[]
  dows: number[]
  domWild: boolean
  dowWild: boolean
}

function parseCron(expr: string): ParsedCron {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5)
    throw new Error('Expected 5 fields: minute hour day-of-month month day-of-week')

  const [mF, hF, domF, moF, dowF] = parts
  return {
    minutes: parseCronField(mF, 0, 59),
    hours: parseCronField(hF, 0, 23),
    doms: parseCronField(domF, 1, 31),
    months: parseCronField(moF, 1, 12, MONTH_NAMES),
    dows: parseCronField(dowF, 0, 7, DOW_NAMES).map(d => (d === 7 ? 0 : d)),
    domWild: domF === '*',
    dowWild: dowF === '*',
  }
}

function getNextExecutions(expr: string, count = 10): Date[] {
  const { minutes, hours, doms, months, dows, domWild, dowWild } = parseCron(expr)
  const result: Date[] = []
  const current = new Date()
  current.setSeconds(0, 0)
  current.setMinutes(current.getMinutes() + 1)

  const limit = 366 * 24 * 60
  let iter = 0

  while (result.length < count && iter < limit) {
    const mo = current.getMonth() + 1
    const d = current.getDate()
    const dow = current.getDay()
    const h = current.getHours()
    const min = current.getMinutes()

    let dayMatch: boolean
    if (domWild && dowWild) dayMatch = true
    else if (domWild) dayMatch = dows.includes(dow)
    else if (dowWild) dayMatch = doms.includes(d)
    else dayMatch = doms.includes(d) || dows.includes(dow)

    if (months.includes(mo) && dayMatch && hours.includes(h) && minutes.includes(min)) {
      result.push(new Date(current))
    }

    current.setMinutes(current.getMinutes() + 1)
    iter++
  }

  return result
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const dow = DOW_SHORT[date.getDay()]
  return `${yyyy}-${mm}-${dd} ${hh}:${min} ${dow}`
}

function describeCron(expr: string): string {
  try {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return ''
    const [mF, hF, domF, moF, dowF] = parts

    if (expr.trim() === '* * * * *') return 'Every minute'

    if (mF === '0' && hF !== '*' && domF === '*' && moF === '*' && dowF === '*') {
      const h = parseInt(hF, 10)
      if (!isNaN(h)) return `Daily at ${String(h).padStart(2, '0')}:00`
    }

    if (mF.startsWith('*/') && hF === '*' && domF === '*' && moF === '*' && dowF === '*') {
      return `Every ${mF.slice(2)} minutes`
    }

    if (mF === '0' && hF.startsWith('*/') && domF === '*' && moF === '*' && dowF === '*') {
      return `Every ${hF.slice(2)} hours`
    }

    const minuteDesc =
      mF === '*' ? 'every minute'
      : mF.startsWith('*/') ? `every ${mF.slice(2)} minutes`
      : `at minute ${mF}`

    const hourDesc =
      hF === '*' ? null
      : hF.startsWith('*/') ? `every ${hF.slice(2)} hours`
      : `hour ${hF}`

    const domDesc = domF === '*' ? null : `on day ${domF} of the month`
    const monthDesc = moF === '*' ? null : `in month ${moF}`

    const dowMap: Record<string, string> = {
      '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
      '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
    }
    const dowDesc =
      dowF === '*' ? null
      : dowMap[dowF] ? `every ${dowMap[dowF]}`
      : `on weekday ${dowF}`

    const descParts: string[] = [minuteDesc]
    if (hourDesc) descParts.push(hourDesc)
    if (domDesc) descParts.push(domDesc)
    if (monthDesc) descParts.push(monthDesc)
    if (dowDesc) descParts.push(dowDesc)

    return descParts.join(', ')
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Quick examples
// ---------------------------------------------------------------------------

const EXAMPLES = [
  { label: '* * * * *', desc: 'Every minute' },
  { label: '*/5 * * * *', desc: 'Every 5 minutes' },
  { label: '0 * * * *', desc: 'Every hour' },
  { label: '0 9 * * *', desc: 'Daily at 9am' },
  { label: '0 9 * * 1', desc: 'Every Monday 9am' },
  { label: '0 0 * * 0', desc: 'Every Sunday midnight' },
  { label: '0 0 1 * *', desc: '1st of every month' },
  { label: '0 0 1 1 *', desc: 'Once a year (Jan 1)' },
  { label: '0 9-17 * * 1-5', desc: 'Hourly 9-5 weekdays' },
  { label: '30 2 * * *', desc: 'Daily at 2:30am' },
]

// ---------------------------------------------------------------------------
// Field table rows
// ---------------------------------------------------------------------------

const FIELD_ROWS = [
  { label: 'Minute', range: '0-59' },
  { label: 'Hour', range: '0-23' },
  { label: 'Day of Month', range: '1-31' },
  { label: 'Month', range: '1-12' },
  { label: 'Day of Week', range: '0-6 (Sun=0)' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CronParser = () => {
  const [expression, setExpression] = useState('*/5 * * * *')
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const parsed = useMemo(() => {
    const expr = expression.trim()
    if (!expr) return null
    try {
      const executions = getNextExecutions(expr, 10)
      const description = describeCron(expr)
      const fields = expr.split(/\s+/)
      setError('')
      return { executions, description, fields }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid cron expression')
      return null
    }
  }, [expression])

  const executionsText = useMemo(() => {
    if (!parsed) return ''
    return parsed.executions.map(formatDate).join('\n')
  }, [parsed])

  const handleClear = useCallback(() => {
    setExpression('')
    setError('')
  }, [])

  const handleCopy = useCallback(() => {
    copyHook.copy(executionsText, (err) => setError(err))
  }, [copyHook, executionsText])

  const handleDownload = useCallback(() => {
    if (!executionsText) return
    const header = `Cron Expression: ${expression}\n${'='.repeat(40)}\nNext 10 Executions:\n\n`
    downloadTextFile(header + executionsText, 'cron-report.txt')
  }, [executionsText, expression])

  const toolbarButtons = [
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: handleCopy,
      disabled: !executionsText,
      title: 'Copy next executions',
    },
    {
      icon: <FileDown size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !executionsText,
      title: 'Download as cron-report.txt',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !expression.trim(),
      title: 'Clear expression',
      showDividerBefore: true,
    },
  ]

  const fields = expression.trim().split(/\s+/)
  const hasValidFields = fields.length === 5

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="cron-input-wrapper">
        <input
          type="text"
          className="cron-expression-input"
          placeholder="* * * * *"
          value={expression}
          onChange={(e) => {
            setExpression(e.target.value)
            setError('')
          }}
          spellCheck={false}
          autoComplete="off"
          aria-label="Cron expression"
        />
      </div>

      <div className="cron-panels">
        <EditorPanel title="Expression Details" headerActions={<AlignLeft size={14} />}>
          <div className="cron-details-content">
            {parsed?.description ? (
              <div className="cron-description">
                <Clock size={16} className="cron-description-icon" />
                <span>{parsed.description}</span>
              </div>
            ) : (
              <div className="cron-description cron-description--placeholder">
                <Clock size={16} className="cron-description-icon" />
                <span>Enter a valid cron expression to see a description</span>
              </div>
            )}

            {hasValidFields && (
              <table className="cron-field-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                    <th>Range</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_ROWS.map((row, i) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className="cron-field-value">{fields[i] ?? '-'}</td>
                      <td className="cron-field-range">{row.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="cron-examples-section">
              <p className="cron-examples-label">
                <Calendar size={14} />
                Quick examples
              </p>
              <div className="cron-examples">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.label}
                    type="button"
                    className={`cron-example-chip ${expression === ex.label ? 'active' : ''}`}
                    onClick={() => {
                      setExpression(ex.label)
                      setError('')
                    }}
                    title={ex.desc}
                  >
                    <code>{ex.label}</code>
                    <span className="cron-chip-desc">{ex.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </EditorPanel>

        <EditorPanel
          title="Next Executions"
          onCopy={executionsText ? handleCopy : undefined}
          copied={copyHook.copied}
          headerActions={<Clock size={14} />}
        >
          {parsed && parsed.executions.length > 0 ? (
            <ol className="cron-executions-list">
              {parsed.executions.map((date, i) => (
                <li key={i} className="cron-execution-item">
                  <span className="cron-execution-index">{i + 1}</span>
                  <code className="cron-execution-time">{formatDate(date)}</code>
                </li>
              ))}
            </ol>
          ) : (
            <div className="cron-empty-state">
              <Clock size={32} />
              <p>
                {error
                  ? 'Fix the expression to see upcoming executions'
                  : 'Enter a cron expression to see the next 10 execution times'}
              </p>
            </div>
          )}
        </EditorPanel>
      </div>
    </ToolContainer>
  )
}

export default CronParser
