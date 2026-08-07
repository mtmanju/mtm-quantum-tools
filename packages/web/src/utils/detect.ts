/**
 * Content detection: given an arbitrary paste, work out what it is.
 *
 * This is the engine behind the paste bar. Instead of asking the user to pick
 * one of 45 tools and then navigate to it, we recognise the input and offer
 * the operations that make sense for it, inline.
 *
 * Deliberately pure and framework-free: no React, no DOM, no imports from
 * components. Every detector is a small predicate, so the whole thing is
 * exhaustively testable — which matters, because a wrong guess here is more
 * annoying than no guess at all.
 */

import { decodeJwt } from './jwt'
import { formatJson, validateJson } from './json'

export type DetectionKind =
  | 'jwt'
  | 'json'
  | 'base64'
  | 'data-uri'
  | 'url'
  | 'url-encoded'
  | 'timestamp'
  | 'iso-date'
  | 'uuid'
  | 'hash'
  | 'color'
  | 'ip'
  | 'cron'
  | 'email'
  | 'xml'
  | 'csv'
  | 'chmod'
  | 'text'

export interface DetectedAction {
  id: string
  label: string
  /** Tool to open with this value prefilled, when the user wants the full UI. */
  toolId?: string
  /** Produces a result inline. Returns null when it can't. */
  run?: (input: string) => string | null
}

export interface Detection {
  kind: DetectionKind
  /** Human label, e.g. "JWT" */
  label: string
  /** 0–1. Detections are returned highest-first. */
  confidence: number
  /** One-line description of what was recognised. */
  summary: string
  actions: DetectedAction[]
}

// ─── helpers ──────────────────────────────────────────────────────────────

const B64_CHARS = /^[A-Za-z0-9+/\r\n\s]*={0,2}$/
const B64URL_CHARS = /^[A-Za-z0-9_-]+$/

function decodeBase64(value: string): string | null {
  try {
    const clean = value.replace(/\s+/g, '')
    const bin = atob(clean)
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return null
  }
}

function decodeBase64Url(segment: string): string | null {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  return decodeBase64(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

/** Share of characters that are printable — used to judge if a decode is text. */
function printableRatio(s: string): number {
  if (!s) return 0
  let printable = 0
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) printable++
  }
  return printable / [...s].length
}

const truncate = (s: string, n = 400) => (s.length > n ? s.slice(0, n) + '…' : s)

// ─── detectors ────────────────────────────────────────────────────────────

function detectJwt(v: string): Detection | null {
  const parts = v.split('.')
  if (parts.length !== 3) return null
  if (!parts.slice(0, 2).every(p => p.length > 0 && B64URL_CHARS.test(p))) return null

  const headerRaw = decodeBase64Url(parts[0])
  if (!headerRaw) return null
  try {
    const header = JSON.parse(headerRaw)
    if (!header || typeof header !== 'object' || !('alg' in header)) return null

    const decoded = decodeJwt(v)
    const alg = String(header.alg)
    return {
      kind: 'jwt',
      label: 'JWT',
      confidence: 0.99,
      summary: `JSON Web Token signed with ${alg}`,
      actions: [
        {
          id: 'jwt-decode',
          label: 'Decode',
          toolId: 'jwt-decoder',
          run: () => {
            const payload = decodeBase64Url(parts[1])
            if (!payload) return null
            try {
              return JSON.stringify(JSON.parse(payload), null, 2)
            } catch {
              return payload
            }
          },
        },
        {
          id: 'jwt-expiry',
          label: 'Check expiry',
          toolId: 'jwt-decoder',
          run: () => {
            const exp = decoded?.payload?.exp
            if (typeof exp !== 'number') return 'No `exp` claim. This token does not expire.'
            const when = new Date(exp * 1000)
            const expired = when.getTime() < Date.now()
            return `${expired ? 'EXPIRED' : 'Valid'}. exp ${exp} (${when.toISOString()})`
          },
        },
      ],
    }
  } catch {
    return null
  }
}

function detectJson(v: string): Detection | null {
  const t = v.trim()
  if (!/^[[{]/.test(t)) return null
  const result = validateJson(t)
  if (!result.isValid) return null

  let shape = 'JSON'
  try {
    const parsed = JSON.parse(t)
    shape = Array.isArray(parsed)
      ? `JSON array of ${parsed.length} item${parsed.length === 1 ? '' : 's'}`
      : `JSON object with ${Object.keys(parsed).length} key${Object.keys(parsed).length === 1 ? '' : 's'}`
  } catch { /* validated above; shape is cosmetic */ }

  return {
    kind: 'json',
    label: 'JSON',
    confidence: 0.96,
    summary: shape,
    actions: [
      { id: 'json-format', label: 'Format', toolId: 'json-formatter', run: s => formatJson(s, 2) },
      { id: 'json-minify', label: 'Minify', toolId: 'json-formatter', run: s => { try { return JSON.stringify(JSON.parse(s)) } catch { return null } } },
      { id: 'json-csv', label: 'To CSV', toolId: 'csv-to-json' },
    ],
  }
}

function detectDataUri(v: string): Detection | null {
  const m = /^data:([\w./+-]+)?(;charset=[\w-]+)?(;base64)?,/.exec(v.trim())
  if (!m) return null
  return {
    kind: 'data-uri',
    label: 'Data URI',
    confidence: 0.98,
    summary: `Data URI${m[1] ? ` of type ${m[1]}` : ''}`,
    actions: [{ id: 'datauri-decode', label: 'Decode payload', toolId: 'base64-converter' }],
  }
}

function detectBase64(v: string): Detection | null {
  const clean = v.replace(/\s+/g, '')
  if (clean.length < 8 || clean.length % 4 !== 0) return null
  if (!B64_CHARS.test(v.trim())) return null
  // Pure digits/letters that are more plausibly something else.
  if (/^\d+$/.test(clean)) return null

  const decoded = decodeBase64(clean)
  if (decoded === null) return null

  const ratio = printableRatio(decoded)
  const looksBinary = ratio < 0.85
  return {
    kind: 'base64',
    label: 'Base64',
    // Text that decodes cleanly is a confident match; binary is plausible but
    // could be coincidence, so it ranks lower.
    confidence: looksBinary ? 0.55 : 0.8,
    summary: looksBinary
      ? `Base64 of ${clean.length} chars, decodes to binary`
      : `Base64, decodes to text`,
    actions: [
      { id: 'b64-decode', label: 'Decode', toolId: 'base64-converter', run: s => decodeBase64(s) },
    ],
  }
}

function detectUrl(v: string): Detection | null {
  const t = v.trim()
  if (!/^https?:\/\//i.test(t)) return null
  try {
    const u = new URL(t)
    const params = [...u.searchParams.keys()]
    return {
      kind: 'url',
      label: 'URL',
      confidence: 0.95,
      summary: `${u.protocol.replace(':', '').toUpperCase()} URL on ${u.hostname}${params.length ? ` with ${params.length} query param${params.length === 1 ? '' : 's'}` : ''}`,
      actions: [
        {
          id: 'url-parts',
          label: 'Break down',
          toolId: 'url-encoder',
          run: () =>
            [
              `protocol  ${u.protocol}`,
              `host      ${u.host}`,
              `path      ${u.pathname}`,
              ...(params.length ? ['query'] : []),
              ...[...u.searchParams.entries()].map(([k, val]) => `  ${k} = ${val}`),
              ...(u.hash ? [`hash      ${u.hash}`] : []),
            ].join('\n'),
        },
        { id: 'url-encode', label: 'Encode', toolId: 'url-encoder', run: s => encodeURIComponent(s.trim()) },
      ],
    }
  } catch {
    return null
  }
}

function detectUrlEncoded(v: string): Detection | null {
  const t = v.trim()
  if (!/%[0-9A-Fa-f]{2}/.test(t)) return null
  try {
    const decoded = decodeURIComponent(t)
    if (decoded === t) return null
    return {
      kind: 'url-encoded',
      label: 'URL-encoded',
      confidence: 0.78,
      summary: 'Percent-encoded text',
      actions: [{ id: 'urldecode', label: 'Decode', toolId: 'url-encoder', run: s => { try { return decodeURIComponent(s.trim()) } catch { return null } } }],
    }
  } catch {
    return null
  }
}

function detectTimestamp(v: string): Detection | null {
  const t = v.trim()
  if (!/^\d{9,13}$/.test(t)) return null
  const n = Number(t)
  const isMillis = t.length >= 12
  const ms = isMillis ? n : n * 1000
  // Reject values outside 1990–2100; those are more likely just numbers.
  if (ms < 631152000000 || ms > 4102444800000) return null
  const d = new Date(ms)
  return {
    kind: 'timestamp',
    label: 'Unix timestamp',
    confidence: 0.88,
    summary: `Unix time in ${isMillis ? 'milliseconds' : 'seconds'}: ${d.toISOString()}`,
    actions: [
      {
        id: 'ts-convert',
        label: 'To date',
        toolId: 'timestamp-converter',
        run: () => [`ISO 8601   ${d.toISOString()}`, `UTC        ${d.toUTCString()}`, `Local      ${d.toString()}`, `Relative   ${relativeTime(d)}`].join('\n'),
      },
    ],
  }
}

function relativeTime(d: Date): string {
  const diff = d.getTime() - Date.now()
  const abs = Math.abs(diff)
  const units: [number, string][] = [
    [31536000000, 'year'], [2592000000, 'month'], [86400000, 'day'],
    [3600000, 'hour'], [60000, 'minute'], [1000, 'second'],
  ]
  for (const [ms, name] of units) {
    if (abs >= ms) {
      const n = Math.round(abs / ms)
      return `${n} ${name}${n === 1 ? '' : 's'} ${diff < 0 ? 'ago' : 'from now'}`
    }
  }
  return 'just now'
}

function detectIsoDate(v: string): Detection | null {
  const t = v.trim()
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(t)) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return {
    kind: 'iso-date',
    label: 'ISO 8601 date',
    confidence: 0.94,
    summary: `Date, ${relativeTime(d)}`,
    actions: [
      {
        id: 'iso-to-ts',
        label: 'To Unix time',
        toolId: 'timestamp-converter',
        run: () => [`seconds       ${Math.floor(d.getTime() / 1000)}`, `milliseconds  ${d.getTime()}`, `UTC           ${d.toUTCString()}`].join('\n'),
      },
    ],
  }
}

function detectUuid(v: string): Detection | null {
  const t = v.trim()
  const m = /^[0-9a-f]{8}-[0-9a-f]{4}-([1-8])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(t)
  if (!m) return null
  return {
    kind: 'uuid',
    label: `UUID v${m[1]}`,
    confidence: 0.98,
    summary: `Version ${m[1]} UUID`,
    actions: [{ id: 'uuid-new', label: 'Generate more', toolId: 'uuid-generator' }],
  }
}

const HASH_BY_LENGTH: Record<number, string> = { 32: 'MD5', 40: 'SHA-1', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' }

function detectHash(v: string): Detection | null {
  const t = v.trim()
  if (!/^[0-9a-f]+$/i.test(t)) return null
  const algo = HASH_BY_LENGTH[t.length]
  if (!algo) return null
  return {
    kind: 'hash',
    label: `${algo} hash`,
    confidence: 0.9,
    summary: `${t.length}-character hex digest, matches ${algo}`,
    actions: [{ id: 'hash-compare', label: 'Hash something', toolId: 'hash-generator' }],
  }
}

function detectColor(v: string): Detection | null {
  const t = v.trim()
  if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) || !t.startsWith('#')) return null
  return {
    kind: 'color',
    label: 'Hex colour',
    confidence: 0.97,
    summary: `Hex colour ${t.toUpperCase()}`,
    actions: [{ id: 'color-convert', label: 'Convert', toolId: 'color-converter' }],
  }
}

function detectIp(v: string): Detection | null {
  const t = v.trim()
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/(\d{1,2}))?$/.exec(t)
  if (!m) return null
  const octets = m.slice(1, 5).map(Number)
  if (octets.some(o => o > 255)) return null
  const prefix = m[6] ? Number(m[6]) : null
  if (prefix !== null && prefix > 32) return null
  return {
    kind: 'ip',
    label: prefix !== null ? 'CIDR block' : 'IPv4 address',
    confidence: 0.95,
    summary: prefix !== null ? `IPv4 network with a /${prefix} prefix` : 'IPv4 address',
    actions: [{ id: 'ip-calc', label: 'Subnet details', toolId: 'ip-cidr-calculator' }],
  }
}

const CRON_FIELD = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+\/\d+|\d+(,\d+)+|[A-Z]{3}(-[A-Z]{3})?)$/i

function detectCron(v: string): Detection | null {
  const fields = v.trim().split(/\s+/)
  if (fields.length < 5 || fields.length > 6) return null
  if (!fields.every(f => CRON_FIELD.test(f))) return null
  if (fields.every(f => f === '*')) {
    // "* * * * *" is valid but so is a line of asterisks; keep it, low-ish.
    return { kind: 'cron', label: 'Cron expression', confidence: 0.8, summary: 'Runs every minute', actions: [{ id: 'cron-parse', label: 'Explain', toolId: 'cron-parser' }] }
  }
  return {
    kind: 'cron',
    label: 'Cron expression',
    confidence: 0.86,
    summary: `${fields.length}-field cron schedule`,
    actions: [{ id: 'cron-parse', label: 'Explain & next runs', toolId: 'cron-parser' }],
  }
}

function detectEmail(v: string): Detection | null {
  const t = v.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return null
  return {
    kind: 'email',
    label: 'Email address',
    confidence: 0.92,
    summary: `Email at ${t.split('@')[1]}`,
    actions: [{ id: 'email-validate', label: 'Validate', toolId: 'email-validator' }],
  }
}

function detectXml(v: string): Detection | null {
  const t = v.trim()
  if (!/^<[?!a-zA-Z]/.test(t) || !/>/.test(t)) return null
  const isHtml = /^<!doctype html|^<html[\s>]/i.test(t)
  return {
    kind: 'xml',
    label: isHtml ? 'HTML' : 'XML',
    confidence: 0.9,
    summary: isHtml ? 'HTML document' : 'XML document',
    actions: [{ id: 'xml-format', label: 'Format', toolId: isHtml ? 'html-formatter' : 'xml-formatter' }],
  }
}

function detectCsv(v: string): Detection | null {
  const lines = v.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return null
  for (const delim of [',', '\t', ';', '|']) {
    const counts = lines.slice(0, 10).map(l => l.split(delim).length)
    if (counts[0] < 2) continue
    if (counts.every(c => c === counts[0])) {
      const name = delim === '\t' ? 'tab' : `"${delim}"`
      return {
        kind: 'csv',
        label: 'Delimited data',
        confidence: 0.72,
        summary: `${lines.length} rows × ${counts[0]} columns, ${name}-separated`,
        actions: [{ id: 'csv-json', label: 'To JSON', toolId: 'csv-to-json' }],
      }
    }
  }
  return null
}

function detectChmod(v: string): Detection | null {
  const t = v.trim()
  if (!/^[0-7]{3,4}$/.test(t)) return null
  const digits = (t.length === 4 ? t.slice(1) : t).split('').map(Number)
  const rwx = digits.map(d => `${d & 4 ? 'r' : '-'}${d & 2 ? 'w' : '-'}${d & 1 ? 'x' : '-'}`).join('')
  return {
    kind: 'chmod',
    label: 'File permissions',
    confidence: 0.62,
    summary: `Octal mode: ${rwx}`,
    actions: [{ id: 'chmod-explain', label: 'Explain', toolId: 'chmod-calculator', run: () => `${t}  →  ${rwx}` }],
  }
}

// ─── entry point ──────────────────────────────────────────────────────────

const DETECTORS: Array<(v: string) => Detection | null> = [
  detectJwt,
  detectDataUri,
  detectUuid,
  detectColor,
  detectJson,
  detectIsoDate,
  detectUrl,
  detectIp,
  detectEmail,
  detectHash,
  detectTimestamp,
  detectXml,
  detectCron,
  detectUrlEncoded,
  detectCsv,
  detectBase64,
  detectChmod,
]

/** Always-available fallback so the bar is never a dead end. */
function textFallback(v: string): Detection {
  const words = v.trim().split(/\s+/).filter(Boolean).length
  return {
    kind: 'text',
    label: 'Text',
    confidence: 0.1,
    summary: `${v.length} characters, ${words} word${words === 1 ? '' : 's'}`,
    actions: [
      { id: 'text-stats', label: 'Count', toolId: 'word-counter' },
      { id: 'text-hash', label: 'Hash it', toolId: 'hash-generator' },
      { id: 'text-b64', label: 'To Base64', toolId: 'base64-converter', run: s => { try { return btoa(unescape(encodeURIComponent(s))) } catch { return null } } },
      { id: 'text-case', label: 'Change case', toolId: 'text-case-converter' },
    ],
  }
}

/**
 * Identify what `input` is. Returns matches highest-confidence first, always
 * with a text fallback last so there is never a dead end.
 */
export function detect(input: string): Detection[] {
  if (!input.trim()) return []
  const value = truncate(input, 100_000)

  const found: Detection[] = []
  for (const detector of DETECTORS) {
    try {
      const result = detector(value)
      if (result) found.push(result)
    } catch {
      // A detector must never be able to break the bar.
    }
  }

  found.sort((a, b) => b.confidence - a.confidence)
  return [...found, textFallback(value)]
}

export { truncate }
