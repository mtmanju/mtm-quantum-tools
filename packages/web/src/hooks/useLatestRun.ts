import { useCallback, useEffect, useRef } from 'react'

/**
 * Guards async work against being superseded.
 *
 * The PDF tools run several `await`s before showing anything — validate, count
 * pages, render a thumbnail — and none of them checked whether the user had
 * moved on. Pick a 100 MB file, see nothing happen, pick a small one: the small
 * one renders, then the large one's chain finishes last and silently replaces
 * it. The card flips back to a file the user thought they had discarded, and
 * the next action operates on the wrong document.
 *
 * `begin()` claims the current run and returns a predicate. Call it before any
 * setState or side effect; it is false once a newer run has started, the work
 * has been cancelled, or the component has unmounted.
 *
 *   const isCurrent = begin()
 *   const data = await slowThing()
 *   if (!isCurrent()) return
 *   setState(data)
 *
 * `cancel()` invalidates the in-flight run without starting one — what a Clear
 * button needs, so a loop still downloading files stops writing to a UI the
 * user has already emptied.
 */
export function useLatestRun() {
  const token = useRef(0)

  // Unmount invalidates whatever is in flight, so a late resolve cannot setState.
  useEffect(() => () => { token.current++ }, [])

  const begin = useCallback(() => {
    const mine = ++token.current
    return () => mine === token.current
  }, [])

  const cancel = useCallback(() => {
    token.current++
  }, [])

  return { begin, cancel }
}
