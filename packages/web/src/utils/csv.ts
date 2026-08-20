export interface CsvToJsonOptions {
  delimiter?: string
  hasHeaders?: boolean
  skipEmptyLines?: boolean
}

export interface CsvParseResult {
  isValid: boolean
  json?: string
  error?: string
  rowCount?: number
  columnCount?: number
}

export const csvToJson = (
  csv: string,
  options: CsvToJsonOptions = {}
): CsvParseResult => {
  const {
    delimiter = ',',
    hasHeaders = true,
    skipEmptyLines = true
  } = options
  
  if (!csv.trim()) {
    return {
      isValid: false,
      error: 'CSV content is empty'
    }
  }
  
  try {
    const parsed = parseCsvRows(csv, delimiter)
    const rows = skipEmptyLines
      ? parsed.filter(row => row.some(field => field.trim() !== ''))
      : parsed
    
    if (rows.length === 0) {
      return {
        isValid: false,
        error: 'No data rows found in CSV'
      }
    }
    
    const headers = hasHeaders ? rows[0] : []
    const dataRows = hasHeaders ? rows.slice(1) : rows
    
    if (hasHeaders && headers.length === 0) {
      return {
        isValid: false,
        error: 'CSV has headers option enabled but no headers found'
      }
    }
    
    const jsonArray = dataRows.map(row => {
      if (hasHeaders) {
        const obj: Record<string, string> = {}
        headers.forEach((header, index) => {
          obj[header.trim()] = row[index]?.trim() || ''
        })
        return obj
      } else {
        return row
      }
    })
    
    const jsonString = JSON.stringify(jsonArray, null, 2)
    
    return {
      isValid: true,
      json: jsonString,
      rowCount: jsonArray.length,
      columnCount: hasHeaders ? headers.length : (rows[0]?.length || 0)
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV'
    }
  }
}

/**
 * Scan a whole CSV document into rows.
 *
 * This replaces a per-line parser that the caller fed with
 * `csv.split(/\r?\n/)`. Splitting on newlines before knowing which of them
 * are inside quotes tears a quoted multi-line field in half: RFC 4180's own
 * example
 *
 *     a,b
 *     "line1
 *     line2",x
 *
 * is one row whose first field contains a newline, but it parsed as two rows
 * — `{a:"line1"}` and `{a:"line2,x"}` — silently corrupting the data and the
 * row count. Addresses, notes and descriptions all routinely contain
 * newlines, so this was not an exotic case.
 *
 * A newline is a row terminator only when the scanner is outside quotes;
 * inside them it is just another character. Everything else the old parser
 * did — `""` as an escaped quote, delimiters inside quotes treated as data —
 * is unchanged.
 */
const parseCsvRows = (csv: string, delimiter: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const endField = () => { row.push(field); field = '' }
  const endRow = () => { endField(); rows.push(row); row = [] }

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]

    if (char === '"') {
      // A doubled quote inside a quoted field is a literal quote.
      if (inQuotes && csv[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes) {
      if (char === delimiter) { endField(); continue }
      // Accept CRLF, LF and lone CR as terminators; consume CRLF as one.
      if (char === '\n') { endRow(); continue }
      if (char === '\r') {
        if (csv[i + 1] === '\n') i++
        endRow()
        continue
      }
    }

    field += char
  }

  // Whatever is left is the final row, unless the file ended on a newline
  // and there is nothing pending.
  if (field !== '' || row.length > 0) endRow()

  return rows
}

export const jsonToCsv = (json: string, options: CsvToJsonOptions = {}): CsvParseResult => {
  const { delimiter = ',', hasHeaders = true } = options
  
  if (!json.trim()) {
    return {
      isValid: false,
      error: 'JSON content is empty'
    }
  }
  
  try {
    const data = JSON.parse(json)
    
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        error: 'JSON must be an array of objects'
      }
    }
    
    if (data.length === 0) {
      return {
        isValid: false,
        error: 'JSON array is empty'
      }
    }
    
    const rows: string[][] = []
    
    if (hasHeaders) {
      const firstItem = data[0]
      if (typeof firstItem !== 'object' || firstItem === null) {
        return {
          isValid: false,
          error: 'JSON array items must be objects when using headers'
        }
      }
      
      const headers = Object.keys(firstItem)
      rows.push(headers)
    }
    
    for (const item of data) {
      if (hasHeaders) {
        if (typeof item !== 'object' || item === null) {
          return {
            isValid: false,
            error: 'All JSON array items must be objects when using headers'
          }
        }
        
        const headers = Object.keys(data[0])
        const row = headers.map(header => {
          const value = item[header]
          const str = value === null || value === undefined ? '' : String(value)
          return escapeCsvValue(str)
        })
        rows.push(row)
      } else {
        if (Array.isArray(item)) {
          rows.push(item.map(v => escapeCsvValue(String(v))))
        } else {
          return {
            isValid: false,
            error: 'JSON array items must be arrays when not using headers'
          }
        }
      }
    }
    
    const csv = rows.map(row => row.join(delimiter)).join('\n')
    
    return {
      isValid: true,
      json: csv,
      rowCount: rows.length,
      columnCount: rows[0]?.length || 0
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format'
    }
  }
}

const escapeCsvValue = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

