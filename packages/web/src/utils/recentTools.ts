/** Recently opened tools, persisted so the command palette is useful on arrival. */

import { readStringArray, writeStorage } from './safeStorage'

const RECENTS_KEY = 'qt-recent-tools'
const MAX_RECENTS = 5

/**
 * Always an array of strings, whatever is actually in storage.
 *
 * This previously returned `(JSON.parse(raw) as string[]).slice(0, MAX)`. The
 * `as string[]` is erased at runtime, so a stored value of `"json-formatter"`
 * (a JSON string rather than an array — schema drift, or a hand-edited entry)
 * parsed fine, `String.prototype.slice` succeeded, and a *string* came back
 * from a function typed `string[]`. Nothing threw inside the try, so the catch
 * never ran; instead `App.tsx` called `.map()` on it during render and the
 * whole app white-screened — on every load, permanently, until the user
 * cleared site data by hand.
 */
export function readRecentTools(): string[] {
  return readStringArray(RECENTS_KEY).slice(0, MAX_RECENTS)
}

export function recordRecentTool(id: string) {
  const next = [id, ...readRecentTools().filter(x => x !== id)].slice(0, MAX_RECENTS)
  writeStorage(RECENTS_KEY, JSON.stringify(next))
}
