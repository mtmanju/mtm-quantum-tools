/**
 * Timestamp conversion utilities
 */

export interface TimestampResult {
  isValid: boolean
  error?: string
  timestamp?: number
  date?: Date
  formatted?: {
    iso: string
    local: string
    utc: string
    unix: number
    milliseconds: number
    timezone?: string
  }
}

/**
 * Converts a timestamp to human-readable date
 */
/**
 * Reject a date the calendar does not contain.
 *
 * JavaScript's date parser rolls an out-of-range day *forward* rather than
 * refusing it: `new Date('2023-02-29')` is 1 March 2023, and
 * `new Date('2023-04-31')` is 1 May. The converter then reported a valid
 * timestamp for a date the user never typed — the worst failure mode a
 * converter has, because the answer looks right. Out-of-range *months* are
 * rejected by the engine already, which is why only the day slipped through.
 *
 * The check is a round trip: parse, then read the components back out and see
 * whether they still say what the input said. ISO forms are parsed as UTC and
 * textual forms as local time, so each is compared in its own frame.
 *
 * Returns an error message, or null when the date is real.
 */
const rejectRolledOverDate = (input: string, parsed: Date): string | null => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/.exec(input)
  if (iso) {
    const [, y, m, d] = iso
    const rolled =
      parsed.getUTCFullYear() !== Number(y) ||
      parsed.getUTCMonth() + 1 !== Number(m) ||
      parsed.getUTCDate() !== Number(d)
    return rolled ? `${y}-${m}-${d} is not a real calendar date` : null
  }

  /**
   * Textual forms — "Feb 30 2023", "30 February 2023". Only the day is
   * checked, and only when the string carries exactly one number that could
   * be a day (1-31) alongside a 4-digit year. That is deliberately narrow:
   * guessing at every locale's date grammar would reject valid input, and a
   * converter that refuses real dates is worse than one that accepts a typo.
   */
  const hasYear = /\b\d{4}\b/.test(input)
  const dayCandidates = input.replace(/\b\d{4}\b/g, ' ').match(/\b\d{1,2}\b/g)
  if (hasYear && dayCandidates?.length === 1) {
    const day = Number(dayCandidates[0])
    if (day >= 1 && day <= 31 && parsed.getDate() !== day) {
      return `${input} is not a real calendar date`
    }
  }
  return null
}

export const timestampToDate = (input: string | number, timezone?: string): TimestampResult => {
  if (!input) {
    return {
      isValid: false,
      error: 'Please enter a timestamp'
    }
  }

  try {
    let timestamp: number

    // Handle string input
    if (typeof input === 'string') {
      const trimmed = input.trim()
      
      // Check if it's a date string
      if (isNaN(Number(trimmed))) {
        // Try to parse as date string
        const date = new Date(trimmed)
        if (isNaN(date.getTime())) {
          return {
            isValid: false,
            error: 'Invalid date format'
          }
        }
        const rolled = rejectRolledOverDate(trimmed, date)
        if (rolled) {
          return { isValid: false, error: rolled }
        }
        timestamp = date.getTime()
      } else {
        // Parse as number
        timestamp = Number(trimmed)
        
        // If timestamp is in seconds (less than year 2000 in milliseconds), convert to milliseconds
        if (timestamp < 946684800000) { // Jan 1, 2000 in milliseconds
          timestamp = timestamp * 1000
        }
      }
    } else {
      timestamp = input
      
      // If timestamp is in seconds (less than year 2000 in milliseconds), convert to milliseconds
      if (timestamp < 946684800000) {
        timestamp = timestamp * 1000
      }
    }

    // Validate timestamp
    if (isNaN(timestamp) || !isFinite(timestamp)) {
      return {
        isValid: false,
        error: 'Invalid timestamp'
      }
    }

    // Validate timestamp range (reasonable date range)
    const minTimestamp = -8640000000000000 // Minimum valid date
    const maxTimestamp = 8640000000000000 // Maximum valid date
    
    if (timestamp < minTimestamp || timestamp > maxTimestamp) {
      return {
        isValid: false,
        error: 'Timestamp out of valid range'
      }
    }

    const date = new Date(timestamp)

    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'Invalid timestamp value'
      }
    }

    const localString = timezone 
      ? date.toLocaleString('en-US', { timeZone: timezone })
      : date.toLocaleString()
    
    // Round timestamp to avoid floating point issues
    const unixSeconds = Math.floor(timestamp / 1000)
    const milliseconds = Math.floor(timestamp)
    
    return {
      isValid: true,
      timestamp: unixSeconds,
      date,
      formatted: {
        iso: date.toISOString(),
        local: localString,
        utc: date.toUTCString(),
        unix: unixSeconds,
        milliseconds: milliseconds,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to convert timestamp'
    }
  }
}

/**
 * Converts a date string to timestamp
 */
export const dateToTimestamp = (dateString: string): TimestampResult => {
  if (!dateString.trim()) {
    return {
      isValid: false,
      error: 'Please enter a date'
    }
  }

  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'Invalid date format'
      }
    }

    const timestamp = date.getTime()

    return {
      isValid: true,
      timestamp: Math.floor(timestamp / 1000), // Unix timestamp in seconds
      date,
      formatted: {
        iso: date.toISOString(),
        local: date.toLocaleString(),
        utc: date.toUTCString(),
        unix: Math.floor(timestamp / 1000),
        milliseconds: timestamp
      }
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to convert date'
    }
  }
}

/**
 * Gets current timestamp
 */
export const getCurrentTimestamp = (): TimestampResult => {
  const now = new Date()
  const timestamp = now.getTime()

  return {
    isValid: true,
    timestamp: Math.floor(timestamp / 1000),
    date: now,
    formatted: {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      utc: now.toUTCString(),
      unix: Math.floor(timestamp / 1000),
      milliseconds: timestamp
    }
  }
}

/**
 * Formats timestamp for display
 */
export const formatTimestampOutput = (result: TimestampResult): string => {
  if (!result.isValid || !result.formatted) {
    return result.error || 'Invalid timestamp'
  }

  const { formatted } = result
  let output = 'Timestamp Conversion Results:\n\n'
  output += `Unix Timestamp (seconds): ${formatted.unix}\n`
  output += `Unix Timestamp (milliseconds): ${formatted.milliseconds}\n\n`
  output += `ISO 8601: ${formatted.iso}\n`
  output += `Local Time: ${formatted.local}\n`
  output += `UTC Time: ${formatted.utc}\n`

  return output
}

