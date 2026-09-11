/// <reference lib="webworker" />
import { testRegex, replaceRegex, type RegexFlags } from '../utils/regex'

/**
 * Runs user-supplied regexes off the main thread.
 *
 * A pattern with nested quantifiers backtracks exponentially: `(a+)+$` against
 * a string of `a`s measured 146 ms at 24 characters and 534 ms at 26 — doubling
 * every two. Past about 40 it never returns. Because the tester evaluates on
 * every keystroke, the tab locked up *while the user was still typing the
 * pattern*, at the moment `(a+)+` first existed, with no way out but closing
 * it. The existing 100,000-character input cap does nothing here; the blow-up
 * is in the pattern, not the input size.
 *
 * A regex cannot be interrupted once started, so the only way to survive one is
 * to run it somewhere that can be destroyed. The caller terminates this worker
 * when a job overruns; the main thread stays responsive throughout.
 */

export type RegexJob =
  | { id: number; kind: 'test'; pattern: string; testString: string; flags: RegexFlags }
  | {
      id: number
      kind: 'replace'
      pattern: string
      testString: string
      replacement: string
      flags: RegexFlags
    }

export type RegexJobResult =
  | { id: number; kind: 'test'; result: ReturnType<typeof testRegex> }
  | { id: number; kind: 'replace'; result: ReturnType<typeof replaceRegex> }

self.onmessage = (event: MessageEvent<RegexJob>) => {
  const job = event.data
  try {
    if (job.kind === 'test') {
      const result = testRegex(job.pattern, job.testString, job.flags)
      ;(self as unknown as Worker).postMessage({ id: job.id, kind: 'test', result })
    } else {
      const result = replaceRegex(job.pattern, job.testString, job.replacement, job.flags)
      ;(self as unknown as Worker).postMessage({ id: job.id, kind: 'replace', result })
    }
  } catch (err) {
    // testRegex/replaceRegex already return result objects for invalid
    // patterns, so reaching here means something unexpected — report it rather
    // than leaving the caller waiting for a message that never comes.
    ;(self as unknown as Worker).postMessage({
      id: job.id,
      kind: job.kind,
      result: {
        isValid: false,
        error: err instanceof Error ? err.message : 'Regex evaluation failed',
        matches: [],
        testString: job.testString,
        pattern: job.pattern,
        flags: '',
      },
    })
  }
}
