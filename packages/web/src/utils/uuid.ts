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
  /**
   * v1, time-based (RFC 4122 §4.2).
   *
   * The previous implementation produced strings that its own isValidUUID()
   * rejected: the node field was built from `hex.substring(3)`, which is 17
   * hex characters out of a 20-character buffer, where the field is 12. Every
   * v1 UUID it emitted was malformed.
   *
   * It also computed the high time bits with `timestamp >> 32` and
   * `timestamp >> 48`. JavaScript's bitwise operators truncate to 32 bits
   * first, so both are no-ops returning the *low* bits — time_mid and
   * time_hi carried a copy of time_low rather than the rest of the clock.
   * BigInt is used here for exactly that reason: the 60-bit UUID timestamp
   * does not fit the 53-bit safe-integer range, let alone 32 bits.
   */
  // 100-nanosecond intervals since the UUID epoch, 1582-10-15.
  const UUID_EPOCH_OFFSET_MS = 12219292800000n
  const intervals = (BigInt(Date.now()) + UUID_EPOCH_OFFSET_MS) * 10000n

  const timeLow = (intervals & 0xFFFFFFFFn).toString(16).padStart(8, '0')
  const timeMid = ((intervals >> 32n) & 0xFFFFn).toString(16).padStart(4, '0')
  const timeHigh = ((intervals >> 48n) & 0x0FFFn).toString(16).padStart(3, '0')

  const rnd = crypto.getRandomValues(new Uint8Array(8))

  // clock_seq: 14 random bits behind the RFC 4122 variant marker (10xx).
  const clockSeq = ((((rnd[0] & 0x3f) | 0x80) << 8) | rnd[1])
    .toString(16)
    .padStart(4, '0')

  // node: 48 bits. A browser cannot read a MAC address, and §4.5 allows a
  // random node ID provided the multicast bit is set, which guarantees it
  // can never collide with a real hardware address.
  const nodeBytes = Array.from(rnd.subarray(2, 8))
  nodeBytes[0] |= 0x01
  const node = nodeBytes.map(b => b.toString(16).padStart(2, '0')).join('')

  return `${timeLow}-${timeMid}-1${timeHigh}-${clockSeq}-${node}`
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

