import { describe, it, expect } from 'vitest'
import { detect, type DetectionKind } from './detect'

/** The kind the engine is most confident about. */
const top = (input: string): DetectionKind | undefined => detect(input)[0]?.kind
const kinds = (input: string): DetectionKind[] => detect(input).map(d => d.kind)

/** Run a named action and return its inline output. */
const runAction = (input: string, actionId: string): string | null => {
  for (const d of detect(input)) {
    const a = d.actions.find(x => x.id === actionId)
    if (a?.run) return a.run(input)
  }
  return null
}

// HS256, {"sub":"1234567890","name":"John Doe","iat":1516239022}
const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('detect — recognises the right thing first', () => {
  it.each<[string, string, DetectionKind]>([
    ['a JWT', JWT, 'jwt'],
    ['a JSON object', '{"name":"Alice","age":30}', 'json'],
    ['a JSON array', '[1,2,3]', 'json'],
    ['a UUID', '550e8400-e29b-41d4-a716-446655440000', 'uuid'],
    ['a hex colour', '#FF5733', 'color'],
    ['a URL', 'https://example.com/path?q=test', 'url'],
    ['an IPv4 address', '192.168.1.1', 'ip'],
    ['a CIDR block', '10.0.0.0/24', 'ip'],
    ['an email address', 'alice@example.com', 'email'],
    ['a SHA-256 digest', 'a'.repeat(64), 'hash'],
    ['an MD5 digest', 'd41d8cd98f00b204e9800998ecf8427e', 'hash'],
    ['a Unix timestamp', '1700000000', 'timestamp'],
    ['an ISO date', '2026-05-11T10:30:00Z', 'iso-date'],
    ['a cron expression', '0 9 * * 1-5', 'cron'],
    ['an XML document', '<?xml version="1.0"?><root><a>1</a></root>', 'xml'],
    ['a data URI', 'data:image/png;base64,iVBORw0KGgo=', 'data-uri'],
    ['Base64 text', 'SGVsbG8sIFdvcmxkIQ==', 'base64'],
  ])('%s → %s', (_name, input, expected) => {
    expect(top(input)).toBe(expected)
  })
})

describe('detect — disambiguation between overlapping formats', () => {
  it('prefers JWT over Base64, even though the segments are Base64', () => {
    expect(top(JWT)).toBe('jwt')
    expect(kinds(JWT)).toContain('jwt')
  })

  it('does not call a plain number Base64', () => {
    expect(kinds('1700000000')).not.toContain('base64')
  })

  it('prefers UUID over hash for a dashed hex string', () => {
    expect(top('550e8400-e29b-41d4-a716-446655440000')).toBe('uuid')
  })

  it('treats a 32-char hex string as a hash, not a UUID', () => {
    expect(top('d41d8cd98f00b204e9800998ecf8427e')).toBe('hash')
  })

  it('rejects timestamps outside a plausible epoch range', () => {
    expect(kinds('100000000')).not.toContain('timestamp')   // 1973
    expect(kinds('999999999999999')).not.toContain('timestamp')
  })

  it('rejects an IP with an octet over 255', () => {
    expect(kinds('999.1.1.1')).not.toContain('ip')
  })

  it('rejects a CIDR prefix over /32', () => {
    expect(kinds('10.0.0.0/48')).not.toContain('ip')
  })

  it('does not treat prose as a cron expression', () => {
    expect(kinds('the quick brown fox jumps')).not.toContain('cron')
  })

  it('only calls a colour a colour when it has a leading #', () => {
    expect(top('#FF5733')).toBe('color')
    expect(kinds('FF5733')).not.toContain('color')
  })
})

describe('detect — always usable', () => {
  it('returns nothing for empty input', () => {
    expect(detect('')).toEqual([])
    expect(detect('   \n  ')).toEqual([])
  })

  it('always offers a text fallback, so there is never a dead end', () => {
    for (const input of ['hello world', 'åß∂ƒ', '🎉🎉🎉', 'xyzzy']) {
      const results = detect(input)
      expect(results.length).toBeGreaterThan(0)
      expect(results[results.length - 1].kind).toBe('text')
    }
  })

  it('sorts strictly by descending confidence', () => {
    const scores = detect(JWT).map(d => d.confidence)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('surfaces secondary interpretations, not just the winner', () => {
    // A JWT is genuinely also inspectable as text.
    expect(kinds(JWT).length).toBeGreaterThan(1)
  })

  it('never throws, whatever it is given', () => {
    const nasty = ['\0\0\0', '%%%', '{"unclosed":', '<<<>>>', 'a'.repeat(50_000), '../../etc/passwd', '\\u0000']
    for (const input of nasty) {
      expect(() => detect(input)).not.toThrow()
    }
  })
})

describe('detect — inline actions produce real results', () => {
  it('decodes a JWT payload', () => {
    const out = runAction(JWT, 'jwt-decode')
    expect(out).toContain('"sub": "1234567890"')
    expect(out).toContain('"name": "John Doe"')
  })

  it('reports JWT expiry status', () => {
    const out = runAction(JWT, 'jwt-expiry')
    // iat 1516239022 with no exp claim
    expect(out).toMatch(/does not expire/)
  })

  it('formats JSON', () => {
    const out = runAction('{"a":1,"b":[2,3]}', 'json-format')
    expect(out).toContain('\n')
    expect(JSON.parse(out!)).toEqual({ a: 1, b: [2, 3] })
  })

  it('minifies JSON', () => {
    expect(runAction('{\n  "a": 1\n}', 'json-minify')).toBe('{"a":1}')
  })

  it('decodes Base64', () => {
    expect(runAction('SGVsbG8sIFdvcmxkIQ==', 'b64-decode')).toBe('Hello, World!')
  })

  it('round-trips text through Base64', () => {
    const encoded = runAction('Hello, World!', 'text-b64')
    expect(encoded).toBe('SGVsbG8sIFdvcmxkIQ==')
  })

  it('breaks a URL into its parts', () => {
    const out = runAction('https://example.com/a/b?x=1&y=2#top', 'url-parts')
    expect(out).toContain('host      example.com')
    expect(out).toContain('x = 1')
    expect(out).toContain('#top')
  })

  it('converts a Unix timestamp to dates', () => {
    const out = runAction('1700000000', 'ts-convert')
    expect(out).toContain('2023-11-14')
  })

  it('converts an ISO date to Unix time', () => {
    const out = runAction('2023-11-14T22:13:20Z', 'iso-to-ts')
    expect(out).toContain('1700000000')
  })

  it('explains an octal file mode', () => {
    expect(runAction('755', 'chmod-explain')).toContain('rwxr-xr-x')
    expect(runAction('644', 'chmod-explain')).toContain('rw-r--r--')
  })
})

describe('detect — every detection is well-formed', () => {
  const samples = [JWT, '{"a":1}', 'https://example.com', '1700000000', '#FF5733', 'hello']

  it('has a label, a summary and at least one action', () => {
    for (const s of samples) {
      for (const d of detect(s)) {
        expect(d.label).toBeTruthy()
        expect(d.summary).toBeTruthy()
        expect(d.actions.length).toBeGreaterThan(0)
        expect(d.confidence).toBeGreaterThan(0)
        expect(d.confidence).toBeLessThanOrEqual(1)
      }
    }
  })

  it('points every action at a real tool or gives it an inline runner', () => {
    for (const s of samples) {
      for (const d of detect(s)) {
        for (const a of d.actions) {
          expect(a.toolId || a.run).toBeTruthy()
          expect(a.id).toBeTruthy()
          expect(a.label).toBeTruthy()
        }
      }
    }
  })
})
