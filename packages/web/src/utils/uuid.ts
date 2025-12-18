/**
 * UUID generation utilities
 */

/**
 * Generates a UUID v4 (random)
 */
export const generateUUID = (): string => {
  return crypto.randomUUID()
}

/**
 * Generates multiple UUIDs
 */
export const generateUUIDs = (count: number): string[] => {
  const uuids: string[] = []
  for (let i = 0; i < count; i++) {
    uuids.push(generateUUID())
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

