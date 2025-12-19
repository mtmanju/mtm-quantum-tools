/**
 * UUID generation utilities
 */

export type UUIDVersion = 'v4' | 'v1'

/**
 * Generates a UUID v4 (random) - standard random UUID
 */
export const generateUUID = (version: UUIDVersion = 'v4'): string => {
  if (version === 'v4') {
    return crypto.randomUUID()
  }
  // v1 (time-based) - simplified implementation
  // Note: Full v1 requires MAC address, which we can't access in browser
  // This generates a time-based UUID-like identifier
  const timestamp = Date.now()
  const random = crypto.getRandomValues(new Uint8Array(10))
  const hex = Array.from(random, b => b.toString(16).padStart(2, '0')).join('')
  
  // Format as UUID v1-like: timestamp-low-timestamp-mid-version-timestamp-high-variant-random
  const timeLow = (timestamp & 0xFFFFFFFF).toString(16).padStart(8, '0')
  const timeMid = ((timestamp >> 32) & 0xFFFF).toString(16).padStart(4, '0')
  const timeHigh = ((timestamp >> 48) & 0x0FFF).toString(16).padStart(3, '0')
  const versionNum = '1'
  const variant = '8'
  
  return `${timeLow}-${timeMid}-${versionNum}${timeHigh}-${variant}${hex.substring(0, 3)}-${hex.substring(3)}`
}

/**
 * Generates multiple UUIDs
 */
export const generateUUIDs = (count: number, version: UUIDVersion = 'v4'): string[] => {
  const uuids: string[] = []
  for (let i = 0; i < count; i++) {
    uuids.push(generateUUID(version))
  }
  return uuids
}

/**
 * Validates if a string is a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

