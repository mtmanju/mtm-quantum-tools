import { useCallback, useEffect, useRef, useState } from 'react'
import type { RegexFlags, RegexTestResult, RegexReplaceResult } from '../utils/regex'
import type { RegexJob, RegexJobResult } from '../workers/regex.worker'

/**
 * How long a single evaluation may run before the worker is destroyed.
 *
 * Generous enough that a legitimately large document finishes — a 100,000
 * character input with an ordinary pattern completes in single-digit
 * milliseconds — and short enough that a runaway pattern is caught while the
 * user is still typing it.
 */
const TIMEOUT_MS = 2000

export interface RegexEvaluation {
  test: RegexTestResult | null
  replace: RegexReplaceResult | null
  /** Set when a pattern was abandoned for overrunning, rather than failing. */
  timedOut: boolean
  running: boolean
}

const IDLE: RegexEvaluation = { test: null, replace: null, timedOut: false, running: false }

/**
 * Evaluates regexes in a worker so a catastrophic pattern cannot take the tab
 * with it.
 *
 * A running regex cannot be interrupted — no flag, no callback, nothing checks
 * for cancellation inside the engine — so the only way to recover from one is
 * to terminate the thread it is on. Everything here exists to make that
 * possible: one job at a time, a timer per job, and a fresh worker after a
 * termination.
 */
export function useRegexEvaluator(
  pattern: string,
  testString: string,
  flags: RegexFlags,
  replacement: string,
  mode: 'test' | 'replace'
): RegexEvaluation {
  const [evaluation, setEvaluation] = useState<RegexEvaluation>(IDLE)

  const workerRef = useRef<Worker | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jobIdRef = useRef(0)

  const disposeWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  useEffect(() => disposeWorker, [disposeWorker])

  // Derived, not stored: with nothing to evaluate the hook simply reports idle
  // (see the return below), which is cheaper and more honest than writing state
  // from an effect to say "nothing happened".
  const isEmpty = !pattern.trim() || !testString.trim()

  useEffect(() => {
    if (isEmpty) return

    /**
     * Debounced so a worker is not spawned per keystroke. This is a comfort
     * measure, not the fix — the worker is what makes a runaway pattern
     * survivable, and the debounce only keeps the common case cheap.
     */
    const debounce = setTimeout(() => {
      const id = ++jobIdRef.current

      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../workers/regex.worker.ts', import.meta.url), {
          type: 'module',
        })
      }
      const worker = workerRef.current

      setEvaluation(prev => ({ ...prev, running: true, timedOut: false }))

      const finish = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = null
        worker.onmessage = null
      }

      worker.onmessage = (event: MessageEvent<RegexJobResult>) => {
        // A message from a superseded job must not overwrite a newer result.
        if (event.data.id !== jobIdRef.current) return
        finish()
        if (event.data.kind === 'test') {
          setEvaluation({ test: event.data.result, replace: null, timedOut: false, running: false })
        } else {
          setEvaluation({ test: null, replace: event.data.result, timedOut: false, running: false })
        }
      }

      timerRef.current = setTimeout(() => {
        // The worker is mid-backtrack and will not answer. Destroying it is the
        // only way to reclaim the thread; the next job builds a fresh one.
        disposeWorker()
        setEvaluation({ test: null, replace: null, timedOut: true, running: false })
      }, TIMEOUT_MS)

      const job: RegexJob =
        mode === 'replace'
          ? { id, kind: 'replace', pattern, testString, replacement, flags }
          : { id, kind: 'test', pattern, testString, flags }

      worker.postMessage(job)
    }, 200)

    return () => clearTimeout(debounce)
  }, [isEmpty, pattern, testString, flags, replacement, mode, disposeWorker])

  return isEmpty ? IDLE : evaluation
}
