/** Recently opened tools, persisted so the command palette is useful on arrival. */

const RECENTS_KEY = 'qt-recent-tools'
const MAX_RECENTS = 5

export function readRecentTools(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

export function recordRecentTool(id: string) {
  try {
    const next = [id, ...readRecentTools().filter(x => x !== id)].slice(0, MAX_RECENTS)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable (private mode) — recents are a nicety, not a feature */
  }
}
