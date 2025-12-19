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
    const lines = csv.split(/\r?\n/)
    const rows: string[][] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (skipEmptyLines && !trimmed) continue
      
      const row = parseCsvLine(trimmed, delimiter)
      rows.push(row)
    }
    
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

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
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

