/**
 * localStorage that cannot take the app down.
 *
 * Every access here is a throw site, and two of them used to be unguarded on
 * the render path:
 *
 * - Reading throws `SecurityError` outright when the browser is set to block
 *   site data, or when the page is in a sandboxed iframe. `ThemeProvider` read
 *   it inside a `useState` initialiser, so the throw happened *during render*
 *   of a provider that wraps the whole tree — and the reload button offered by
 *   the error boundary re-ran the same line, so the app was dead on every
 *   visit rather than once.
 *
 * - Writing throws `QuotaExceededError` when storage is full, and in Safari's
 *   private mode historically threw on any write at all.
 *
 * None of what we keep here is load-bearing: a theme preference and a recents
 * list. Losing them is a worse experience; throwing over them is a blank page.
 */

export const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable or full — the preference just does not persist */
  }
}

/**
 * Parse a JSON array of strings that a previous version of the app (or a user
 * with devtools open) may have written in a different shape.
 *
 * `JSON.parse(raw) as string[]` is not a check — the assertion is erased at
 * runtime. A stored JSON *string* parses without throwing, so the `try/catch`
 * never fired and a `string` was returned from a function declared to return
 * `string[]`; the caller's `.map()` then threw during render.
 */
export const readStringArray = (key: string): string[] => {
  const raw = readStorage(key)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}
