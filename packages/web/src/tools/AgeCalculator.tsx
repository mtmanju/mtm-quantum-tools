import { Cake, Calendar, CalendarDays, Check, Clock, Copy, FileDown, Rabbit, RotateCcw, Sparkles } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DateField } from '../components/ui/DateField'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import './AgeCalculator.css'

interface AgeBreakdown {
  years: number
  months: number
  days: number
}

interface ZodiacInfo {
  sign: string
  emoji: string
}

interface AgeResult {
  age: AgeBreakdown
  totalYears: number
  totalMonths: number
  totalWeeks: number
  totalDays: number
  totalHours: number
  totalMinutes: number
  bornDayOfWeek: string
  zodiac: ZodiacInfo
  chineseZodiac: ZodiacInfo
  nextBirthdayDays: number
  nextBirthdayDate: Date
  birthdayThisYearDayOfWeek: string
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function calculateAge(birth: Date, asOf: Date): AgeBreakdown {
  let years = asOf.getFullYear() - birth.getFullYear()
  let months = asOf.getMonth() - birth.getMonth()
  let days = asOf.getDate() - birth.getDate()

  if (days < 0) {
    months--
    const prevMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  return { years, months, days }
}

function getZodiacSign(month: number, day: number): ZodiacInfo {
  const signs: { sign: string; emoji: string; start: [number, number]; end: [number, number] }[] = [
    { sign: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19] },
    { sign: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
  ]
  for (const s of signs) {
    if (
      (month === s.start[0] && day >= s.start[1]) ||
      (month === s.end[0] && day <= s.end[1])
    ) {
      return { sign: s.sign, emoji: s.emoji }
    }
  }
  return { sign: 'Capricorn', emoji: '♑' }
}

function getChineseZodiac(year: number): ZodiacInfo {
  const animals: ZodiacInfo[] = [
    { sign: 'Monkey', emoji: '🐵' },
    { sign: 'Rooster', emoji: '🐔' },
    { sign: 'Dog', emoji: '🐕' },
    { sign: 'Pig', emoji: '🐖' },
    { sign: 'Rat', emoji: '🐀' },
    { sign: 'Ox', emoji: '🐂' },
    { sign: 'Tiger', emoji: '🐅' },
    { sign: 'Rabbit', emoji: '🐇' },
    { sign: 'Dragon', emoji: '🐉' },
    { sign: 'Snake', emoji: '🐍' },
    { sign: 'Horse', emoji: '🐎' },
    { sign: 'Goat', emoji: '🐐' },
  ]
  return animals[((year % 12) + 12) % 12]
}

function daysUntilNextBirthday(birth: Date, asOf: Date): { days: number; date: Date } {
  const asOfMidnight = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  const thisYear = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate())
  const nextBirthday =
    thisYear < asOfMidnight
      ? new Date(asOf.getFullYear() + 1, birth.getMonth(), birth.getDate())
      : thisYear
  const days = Math.round(
    (nextBirthday.getTime() - asOfMidnight.getTime()) / (1000 * 60 * 60 * 24)
  )
  return { days, date: nextBirthday }
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length !== 3) return null
  const [y, m, d] = parts.map((p) => parseInt(p, 10))
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  if (isNaN(date.getTime())) return null
  return date
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatNiceDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  return `${weekday}, ${formatDMY(date)}`
}

function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString()
}

const todayStr = (): string => formatLocalDate(new Date())

/** Renders a date as dd/mm/yyyy, the format used throughout this tool. */
function formatDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

const AgeCalculator = () => {
  const [birthDate, setBirthDate] = useState('')
  const [asOfDate, setAsOfDate] = useState(todayStr())
  /**
   * Errors raised by user *actions* (copy, download). Validation errors are
   * derived below and never stored — writing state during render forces an
   * extra render pass and leaves the message one render behind the value
   * that caused it.
   */
  const [actionError, setActionError] = useState('')

  const copyHook = useCopy()

  const today = todayStr()

  const computed = useMemo<{ result: AgeResult | null; error: string }>(() => {
    if (!birthDate) return { result: null, error: '' }
    const birth = parseLocalDate(birthDate)
    const asOf = parseLocalDate(asOfDate) ?? new Date()
    if (!birth) {
      return { result: null, error: 'Invalid birth date' }
    }
    if (birth > asOf) {
      return { result: null, error: 'Birth date cannot be after the "as of" date' }
    }

    const age = calculateAge(birth, asOf)
    const diffMs = asOf.getTime() - birth.getTime()
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    const totalWeeks = Math.floor(totalDays / 7)
    const totalMonths = age.years * 12 + age.months
    const totalYears = age.years

    const bornDayOfWeek = WEEKDAYS[birth.getDay()]
    const zodiac = getZodiacSign(birth.getMonth() + 1, birth.getDate())
    const chineseZodiac = getChineseZodiac(birth.getFullYear())
    const next = daysUntilNextBirthday(birth, asOf)
    const birthdayThisYear = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate())
    const birthdayThisYearDayOfWeek = WEEKDAYS[birthdayThisYear.getDay()]

    return {
      result: {
        age,
        totalYears,
        totalMonths,
        totalWeeks,
        totalDays,
        totalHours,
        totalMinutes,
        bornDayOfWeek,
        zodiac,
        chineseZodiac,
        nextBirthdayDays: next.days,
        nextBirthdayDate: next.date,
        birthdayThisYearDayOfWeek,
      },
      error: '',
    }
  }, [birthDate, asOfDate])

  const result = computed.result
  const error = actionError || computed.error

  const buildSummary = useCallback((): string => {
    if (!result) return ''
    const ageStr = `${result.age.years} years, ${result.age.months} months, ${result.age.days} days`
    return [
      `Age Report`,
      `==========`,
      `Birth Date:           ${birthDate}`,
      `As of Date:           ${asOfDate}`,
      ``,
      `Age:                  ${ageStr}`,
      `Total Years:          ${formatNumber(result.totalYears)}`,
      `Total Months:         ${formatNumber(result.totalMonths)}`,
      `Total Weeks:          ${formatNumber(result.totalWeeks)}`,
      `Total Days:           ${formatNumber(result.totalDays)}`,
      `Total Hours:          ${formatNumber(result.totalHours)}`,
      `Total Minutes:        ${formatNumber(result.totalMinutes)}`,
      ``,
      `Day of Week Born:     ${result.bornDayOfWeek}`,
      `Zodiac Sign:          ${result.zodiac.sign}`,
      `Chinese Zodiac:       ${result.chineseZodiac.sign}`,
      ``,
      `Next Birthday In:     ${result.nextBirthdayDays} day${result.nextBirthdayDays === 1 ? '' : 's'}`,
      `Next Birthday Date:   ${formatNiceDate(result.nextBirthdayDate)}`,
      `Birthday This Year:   ${result.birthdayThisYearDayOfWeek}`,
    ].join('\n')
  }, [result, birthDate, asOfDate])

  const handleDownload = useCallback(() => {
    if (!result) return
    try {
      const text = buildSummary()
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'age-report.txt'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Download failed')
    }
  }, [result, buildSummary])

  const handleReset = useCallback(() => {
    setBirthDate('')
    setAsOfDate(todayStr())
    setActionError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy summary',
      onClick: () => copyHook.copy(buildSummary(), (err) => setActionError(err)),
      disabled: !result,
      title: 'Copy age summary',
      showDividerBefore: true,
    },
    {
      icon: <FileDown size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !result,
      title: 'Download age report',
    },
    {
      icon: <RotateCcw size={16} />,
      label: 'Clear',
      onClick: handleReset,
      title: 'Clear inputs',
      showDividerBefore: true,
    },
  ]

  const statCards: { label: string; value: string; icon?: React.ReactNode }[] = result
    ? [
        { label: 'Total Years', value: formatNumber(result.totalYears) },
        { label: 'Total Months', value: formatNumber(result.totalMonths) },
        { label: 'Total Weeks', value: formatNumber(result.totalWeeks) },
        { label: 'Total Days', value: formatNumber(result.totalDays) },
        {
          label: 'Total Hours',
          value: formatNumber(result.totalHours),
          icon: <Clock size={14} />,
        },
        {
          label: 'Total Minutes',
          value: formatNumber(result.totalMinutes),
          icon: <Clock size={14} />,
        },
        {
          label: 'Day of Week Born',
          value: result.bornDayOfWeek,
          icon: <Calendar size={14} />,
        },
        {
          label: 'Birthday This Year',
          value: result.birthdayThisYearDayOfWeek,
          icon: <Calendar size={14} />,
        },
        {
          label: 'Next Birthday In',
          value: `${result.nextBirthdayDays} day${result.nextBirthdayDays === 1 ? '' : 's'}`,
          icon: <Cake size={14} />,
        },
        {
          label: 'Next Birthday Date',
          value: formatDMY(result.nextBirthdayDate),
          icon: <Cake size={14} />,
        },
      ]
    : []

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="age-body">
        <div className="age-inputs">
          <DateField
            id="age-birth-date"
            label="Birth Date"
            value={birthDate}
            max={today}
            onChange={iso => { setBirthDate(iso); setActionError('') }}
          />
          <DateField
            id="age-as-of-date"
            label="As of Date"
            value={asOfDate}
            onChange={iso => { setAsOfDate(iso); setActionError('') }}
          />
        </div>

        {!result && !error && (
          <EmptyState
            icon={<CalendarDays size={32} strokeWidth={1.5} aria-hidden="true" />}
            title="Your age breakdown will appear here"
            hint="Pick a date of birth to see years, months, and days."
          />
        )}

        {result && (
          <>
            <div className="age-hero-card">
              <div className="age-hero-label">Your Age</div>
              <div className="age-hero-value">
                <span className="age-hero-num">{result.age.years}</span>
                <span className="age-hero-unit">years</span>
                <span className="age-hero-num">{result.age.months}</span>
                <span className="age-hero-unit">months</span>
                <span className="age-hero-num">{result.age.days}</span>
                <span className="age-hero-unit">days</span>
              </div>
            </div>

            {/* These two cards used to show the zodiac emoji at 32px: a
                purple ♊ and a green 🐎, the only full-colour objects anywhere
                in an otherwise monochrome interface, drawn by the OS so they
                looked different on every machine. The sign's *name* is the
                answer; the glyph was decoration fighting the design system.
                They now use the same line icons as every other result tile.
                (The emoji stay in the data for the exported summary.) */}
            <div className="age-zodiac-section">
              <div className="age-zodiac-card">
                <span className="age-zodiac-icon" aria-hidden="true">
                  <Sparkles size={18} strokeWidth={1.75} />
                </span>
                <div className="age-zodiac-info">
                  <div className="age-result-label">Zodiac Sign</div>
                  <div className="age-zodiac-name">{result.zodiac.sign}</div>
                </div>
              </div>
              <div className="age-zodiac-card">
                <span className="age-zodiac-icon" aria-hidden="true">
                  <Rabbit size={18} strokeWidth={1.75} />
                </span>
                <div className="age-zodiac-info">
                  <div className="age-result-label">Chinese Zodiac</div>
                  <div className="age-zodiac-name">{result.chineseZodiac.sign}</div>
                </div>
              </div>
            </div>

            <div className="age-results-grid">
              {statCards.map(({ label, value, icon }) => (
                <div key={label} className="age-result-card">
                  <div className="age-result-label">
                    {icon && <span className="age-result-icon">{icon}</span>}
                    {label}
                  </div>
                  <div className="age-result-value">{value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {!result && !error && (
          <div className="age-placeholder">
            Enter a birth date to calculate age, zodiac, and more.
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default AgeCalculator
