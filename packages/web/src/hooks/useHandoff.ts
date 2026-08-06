import { useEffect } from 'react'

/**
 * Receives a value handed over by the paste bar when it opens a tool.
 *
 * Read once and cleared immediately, so a refresh or a later visit starts
 * clean rather than resurrecting something the user pasted ten minutes ago.
 * sessionStorage rather than the URL: the value is often large and frequently
 * sensitive (tokens, payloads), and the address bar leaks into history.
 */
export function useHandoff(toolId: string, apply: (value: string) => void) {
  useEffect(() => {
    const key = `qt-handoff:${toolId}`
    let value: string | null = null
    try {
      value = sessionStorage.getItem(key)
      if (value !== null) sessionStorage.removeItem(key)
    } catch {
      return
    }
    if (value) apply(value)
    // Intentionally runs once per mount: a handoff is a one-shot delivery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId])
}
